use error_stack::{Result, ResultExt};
use kafkaoxide_core::AppError;

pub trait SecretStore: Send + Sync {
    fn set_password(&self, connection_id: &str, password: &str) -> Result<(), AppError>;
    fn get_password(&self, connection_id: &str) -> Result<Option<String>, AppError>;
    fn delete_password(&self, connection_id: &str) -> Result<(), AppError>;
}

const SERVICE: &str = "kafkaoxide";

fn account_for(connection_id: &str) -> String {
    format!("connection:{connection_id}")
}

pub struct KeyringSecretStore;

impl SecretStore for KeyringSecretStore {
    fn set_password(&self, connection_id: &str, password: &str) -> Result<(), AppError> {
        let entry = keyring::Entry::new(SERVICE, &account_for(connection_id))
            .change_context(AppError::Secrets)
            .attach_printable_lazy(|| format!("failed to open keychain entry for {connection_id}"))?;

        entry
            .set_password(password)
            .change_context(AppError::Secrets)
            .attach_printable_lazy(|| format!("failed to store secret for {connection_id}"))
    }

    fn get_password(&self, connection_id: &str) -> Result<Option<String>, AppError> {
        let entry = keyring::Entry::new(SERVICE, &account_for(connection_id))
            .change_context(AppError::Secrets)
            .attach_printable_lazy(|| format!("failed to open keychain entry for {connection_id}"))?;

        match entry.get_password() {
            Ok(password) => Ok(Some(password)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(err) => Err(err)
                .change_context(AppError::Secrets)
                .attach_printable_lazy(|| format!("failed to read secret for {connection_id}")),
        }
    }

    fn delete_password(&self, connection_id: &str) -> Result<(), AppError> {
        let entry = keyring::Entry::new(SERVICE, &account_for(connection_id))
            .change_context(AppError::Secrets)
            .attach_printable_lazy(|| format!("failed to open keychain entry for {connection_id}"))?;

        match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(err) => Err(err)
                .change_context(AppError::Secrets)
                .attach_printable_lazy(|| format!("failed to delete secret for {connection_id}")),
        }
    }
}

pub mod testing {
    use super::SecretStore;
    use error_stack::Result;
    use kafkaoxide_core::AppError;
    use std::collections::HashMap;
    use std::sync::Mutex;

    #[derive(Default)]
    pub struct InMemorySecretStore {
        entries: Mutex<HashMap<String, String>>,
    }

    impl SecretStore for InMemorySecretStore {
        fn set_password(&self, connection_id: &str, password: &str) -> Result<(), AppError> {
            self.entries
                .lock()
                .unwrap()
                .insert(connection_id.to_string(), password.to_string());
            Ok(())
        }

        fn get_password(&self, connection_id: &str) -> Result<Option<String>, AppError> {
            Ok(self.entries.lock().unwrap().get(connection_id).cloned())
        }

        fn delete_password(&self, connection_id: &str) -> Result<(), AppError> {
            self.entries.lock().unwrap().remove(connection_id);
            Ok(())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::testing::InMemorySecretStore;
    use super::SecretStore;

    #[test]
    fn round_trips_a_password() {
        let store = InMemorySecretStore::default();
        store.set_password("conn-1", "hunter2").unwrap();
        assert_eq!(store.get_password("conn-1").unwrap(), Some("hunter2".to_string()));
    }

    #[test]
    fn missing_password_returns_none() {
        let store = InMemorySecretStore::default();
        assert_eq!(store.get_password("missing").unwrap(), None);
    }

    #[test]
    fn delete_removes_a_password() {
        let store = InMemorySecretStore::default();
        store.set_password("conn-1", "hunter2").unwrap();
        store.delete_password("conn-1").unwrap();
        assert_eq!(store.get_password("conn-1").unwrap(), None);
    }

    #[test]
    fn delete_of_missing_password_is_a_no_op() {
        let store = InMemorySecretStore::default();
        store.delete_password("missing").unwrap();
    }
}
