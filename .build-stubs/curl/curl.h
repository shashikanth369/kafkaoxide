/*
 * Empty stub for <curl/curl.h>.
 *
 * Build-time workaround: the vendored librdkafka source in rdkafka-sys
 * 4.10.0+2.12.1 has a bug in src/rdkafka_conf.c where the curl header is
 * pulled in via `#ifdef WITH_OAUTHBEARER_OIDC` instead of
 * `#if WITH_OAUTHBEARER_OIDC`. Because config.h always defines
 * WITH_OAUTHBEARER_OIDC (to 0 or 1, via #cmakedefine01), the #ifdef is
 * always true even when OIDC support (and therefore libcurl) is disabled,
 * so the header is included even though this build has WITH_CURL=0 and no
 * libcurl-dev package is installed. Every actual use of curl symbols in
 * that file is correctly guarded by `#if WITH_OAUTHBEARER_OIDC`, which
 * evaluates to 0 in this build, so nothing here needs to declare anything
 * real -- the compiler just needs *a* header to find.
 *
 * This file is added to the include path only via CPATH when building the
 * kafkaoxide-kafka crate locally; it is not part of the crate's own source.
 */
#pragma once
