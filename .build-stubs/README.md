# .build-stubs

Build-time-only header shims, added to the C/C++ include search path via
`CPATH` in `../.cargo/config.toml`. Not part of any crate's real source.

## curl/curl.h

Works around a bug in the vendored librdkafka source shipped by
`rdkafka-sys` 4.10.0+2.12.1 (a dependency of `crates/kafka`'s `rdkafka` dep)
that includes `<curl/curl.h>` even when this build has curl/SSL/OIDC support
fully disabled and no `libcurl-dev` is installed, which otherwise fails the
build. It forwards to a real `curl/curl.h` via `#include_next` if one is
ever found later in the include path, so it does not shadow a real libcurl
install if a future dev machine or build configuration has one.

See the comment block at the top of `curl/curl.h` for the full explanation,
and the comment block in `../.cargo/config.toml` for why this is CPATH-based
rather than `-idirafter`-based.

If this project ever wants real OAuth/OIDC support (the rdkafka `ssl` +
`curl` features), re-check whether this is still needed -- ideally replace
it with a proper `[patch]` of the one-line upstream typo in
`rdkafka_conf.c`, or delete it once upstream rdkafka-sys fixes it.
