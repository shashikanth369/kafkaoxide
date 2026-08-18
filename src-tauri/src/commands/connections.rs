use crate::state::AppState;
use kafkaoxide_core::{Connection, ConnectionStatus, NewConnection};
use tauri::{AppHandle, State};

#[derive(serde::Serialize)]
pub struct CommandError {
    pub message: String,
}

impl From<error_stack::Report<kafkaoxide_core::AppError>> for CommandError {
    fn from(report: error_stack::Report<kafkaoxide_core::AppError>) -> Self {
        CommandError {
            message: format!("{report:?}"),
        }
    }
}

#[tauri::command]
pub async fn connection_list(state: State<'_, AppState>) -> Result<Vec<Connection>, CommandError> {
    Ok(kafkaoxide_db::connections::list(&state.pool).await?)
}

#[tauri::command]
pub async fn connection_create(
    app: AppHandle,
    state: State<'_, AppState>,
    new_connection: NewConnection,
) -> Result<Connection, CommandError> {
    let password = new_connection.sasl_password.clone();
    let connection = kafkaoxide_db::connections::create(&state.pool, &new_connection).await?;
    if let Some(password) = password {
        state.secrets.set_password(&connection.id, &password)?;
    }
    crate::logging::emit_log(&app, "info", format!("Created connection \"{}\"", connection.name));
    Ok(connection)
}

#[tauri::command]
pub async fn connection_update(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
    new_connection: NewConnection,
) -> Result<Connection, CommandError> {
    let password = new_connection.sasl_password.clone();
    let connection = kafkaoxide_db::connections::update(&state.pool, &id, &new_connection).await?;
    if let Some(password) = password {
        state.secrets.set_password(&connection.id, &password)?;
    }
    crate::logging::emit_log(&app, "info", format!("Updated connection \"{}\"", connection.name));
    Ok(connection)
}

#[tauri::command]
pub async fn connection_delete(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), CommandError> {
    kafkaoxide_db::connections::delete(&state.pool, &id).await?;
    state.secrets.delete_password(&id)?;
    crate::logging::emit_log(&app, "info", format!("Deleted connection {id}"));
    Ok(())
}

#[tauri::command]
pub async fn connection_check_status(
    state: State<'_, AppState>,
    id: String,
) -> Result<ConnectionStatus, CommandError> {
    let connection = kafkaoxide_db::connections::get(&state.pool, &id).await?;
    let password = state.secrets.get_password(&id)?;
    Ok(state.kafka.check_status(&connection, password.as_deref()).await?)
}
