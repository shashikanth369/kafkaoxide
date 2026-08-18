/*
 * Forwarding shim for <curl/curl.h> -- NOT a real curl header.
 *
 * Why this exists
 * ----------------
 * The vendored librdkafka source in rdkafka-sys 4.10.0+2.12.1 has a bug in
 * src/rdkafka_conf.c: it pulls in <curl/curl.h> via
 *
 *     #ifdef WITH_OAUTHBEARER_OIDC
 *     #include <curl/curl.h>
 *     #endif
 *
 * instead of `#if WITH_OAUTHBEARER_OIDC`. Because the generated config.h
 * always *defines* WITH_OAUTHBEARER_OIDC (to 0 or 1, via CMake's
 * `cmakedefine01`), that `#ifdef` is always true -- so the header is
 * pulled in even when this crate builds with WITH_CURL=0 / WITH_SSL=0 (no
 * OIDC/curl support requested, no libcurl-dev installed). Every *use* of
 * curl symbols in that file is correctly guarded by
 * `#if WITH_OAUTHBEARER_OIDC`, which evaluates to 0 in that configuration,
 * so the only thing actually required is a header the compiler can find.
 *
 * Why this is a forwarding shim, not an empty stub
 * -------------------------------------------------
 * This directory is added to the search path via CPATH (see
 * ../../.cargo/config.toml), which places it *before* the standard system
 * include directories (e.g. /usr/include). A naive empty stub here would
 * therefore permanently shadow a *real* curl/curl.h on any machine that
 * has libcurl-dev installed, silently breaking real OIDC/curl support
 * with confusing "undefined identifier" errors instead of building it.
 *
 * `#include_next` tells the preprocessor to keep searching the *rest* of
 * the include path (i.e. anywhere after this directory, including the
 * real system directories) for another header also named "curl/curl.h".
 * So:
 *   - No real curl.h anywhere on the machine: this shim contributes
 *     nothing, matching today's WITH_OAUTHBEARER_OIDC=0 dead-code path.
 *   - A real curl.h exists later in the search path (e.g. libcurl-dev is
 *     installed): it gets included transparently, and real curl
 *     declarations are available exactly as if this shim weren't here.
 * This has been verified locally with a throwaway `cc -E` test that puts
 * a marker header "later" in the search path and confirms it -- not the
 * empty shim -- ends up included.
 *
 * If this project ever wants real OAuth/OIDC support (WITH_SSL=1 and
 * WITH_CURL=1 / the rdkafka "ssl" + "curl" features), this workaround can
 * likely just be deleted at that point -- a real curl.h will already take
 * priority via #include_next above. The proper long-term fix is either a
 * one-line `[patch]` of the upstream `#ifdef` -> `#if` typo in
 * rdkafka_conf.c, or dropping this once upstream rdkafka-sys fixes it.
 */
#pragma once
#if defined(__has_include_next)
#  if __has_include_next(<curl/curl.h>)
#    include_next <curl/curl.h>
#  endif
#endif
