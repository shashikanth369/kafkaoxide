use std::collections::BTreeMap;

/// For each partition, how many messages to pull: `min(available, cap)`,
/// where `available = end_offset - start_offset` (never negative — clamped
/// to 0 for a partition with no messages in range). Pulled out as pure
/// logic (no rdkafka I/O) so the counting math is unit-testable without a
/// live broker, unlike the rest of this module's methods.
pub fn partition_limits(
    start_offsets: &BTreeMap<i32, i64>,
    end_offsets: &BTreeMap<i32, i64>,
    max_per_partition: Option<u32>,
) -> BTreeMap<i32, i64> {
    let cap = max_per_partition.map(i64::from).unwrap_or(i64::MAX);
    start_offsets
        .iter()
        .map(|(&partition, &start)| {
            let end = end_offsets.get(&partition).copied().unwrap_or(start);
            let available = (end - start).max(0);
            (partition, available.min(cap))
        })
        .collect()
}

/// Applies an overall `max_total_messages` cap across the already
/// per-partition-capped limits, preserving relative partition order and
/// truncating whichever partitions come last once the total is exhausted.
pub fn apply_total_cap(limits: &BTreeMap<i32, i64>, max_total: Option<u32>) -> BTreeMap<i32, i64> {
    let Some(max_total) = max_total else {
        return limits.clone();
    };
    let mut remaining = i64::from(max_total);
    let mut result = BTreeMap::new();
    for (&partition, &limit) in limits {
        if remaining <= 0 {
            break;
        }
        let take = limit.min(remaining);
        result.insert(partition, take);
        remaining -= take;
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    fn map(pairs: &[(i32, i64)]) -> BTreeMap<i32, i64> {
        pairs.iter().copied().collect()
    }

    #[test]
    fn limits_to_the_full_range_when_no_cap_is_given() {
        let start = map(&[(0, 100)]);
        let end = map(&[(0, 150)]);
        assert_eq!(partition_limits(&start, &end, None), map(&[(0, 50)]));
    }

    #[test]
    fn caps_at_max_per_partition_when_more_is_available() {
        let start = map(&[(0, 100)]);
        let end = map(&[(0, 1000)]);
        assert_eq!(partition_limits(&start, &end, Some(10)), map(&[(0, 10)]));
    }

    #[test]
    fn does_not_exceed_available_even_if_the_cap_is_higher() {
        let start = map(&[(0, 100)]);
        let end = map(&[(0, 105)]);
        assert_eq!(partition_limits(&start, &end, Some(50)), map(&[(0, 5)]));
    }

    #[test]
    fn clamps_to_zero_for_an_empty_or_inverted_range() {
        let start = map(&[(0, 100)]);
        let end = map(&[(0, 100)]);
        assert_eq!(partition_limits(&start, &end, None), map(&[(0, 0)]));
    }

    #[test]
    fn computes_each_partition_independently() {
        let start = map(&[(0, 0), (1, 50)]);
        let end = map(&[(0, 10), (1, 200)]);
        assert_eq!(partition_limits(&start, &end, Some(20)), map(&[(0, 10), (1, 20)]));
    }

    #[test]
    fn apply_total_cap_is_a_no_op_when_no_max_total_is_given() {
        let limits = map(&[(0, 10), (1, 20)]);
        assert_eq!(apply_total_cap(&limits, None), limits);
    }

    #[test]
    fn apply_total_cap_splits_the_budget_across_partitions_in_order() {
        let limits = map(&[(0, 10), (1, 20)]);
        assert_eq!(apply_total_cap(&limits, Some(15)), map(&[(0, 10), (1, 5)]));
    }

    #[test]
    fn apply_total_cap_drops_later_partitions_once_exhausted() {
        let limits = map(&[(0, 10), (1, 20)]);
        assert_eq!(apply_total_cap(&limits, Some(10)), map(&[(0, 10)]));
    }
}
