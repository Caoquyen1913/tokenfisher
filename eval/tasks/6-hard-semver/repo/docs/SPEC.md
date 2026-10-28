# Version ranges

`satisfies(version, range)` returns `true` when `version` matches `range`, otherwise `false`. It never throws: an invalid version or an invalid range returns `false`.

## Versions

`MAJOR.MINOR.PATCH`, each a non-negative integer without leading zeros, optionally followed by:

- `-PRERELEASE`: dot-separated identifiers of `[0-9A-Za-z-]`, e.g. `1.0.0-alpha.1`
- `+BUILD`: dot-separated identifiers; build metadata is ignored everywhere

A leading `v` is allowed (`v1.2.3`). Surrounding whitespace is ignored.

### Ordering

Compare major, then minor, then patch numerically. When those are equal:

- a version **without** a prerelease is greater than one with a prerelease (`1.0.0-rc.1 < 1.0.0`);
- otherwise compare prerelease identifiers left to right: two numeric identifiers compare numerically, two alphanumeric ones compare in ASCII order, and a numeric identifier is lower than an alphanumeric one; if all compared identifiers are equal, the version with fewer identifiers is lower (`1.0.0-alpha < 1.0.0-alpha.1`).

## Ranges

A range is one or more **comparator sets** joined by `||`. A version satisfies the range if it satisfies **any** set. A comparator set is one or more comparators separated by whitespace; a version satisfies the set if it satisfies **all** of them.

### Comparators

`<`, `<=`, `>`, `>=`, `=` followed by a version. No operator means `=`. Whitespace between the operator and the version is allowed (`>= 1.2.3`).

### Partial versions and X-ranges

`x`, `X` or `*` in a position, or a missing position, is a wildcard. Without an operator:

| range | means |
|---|---|
| `*` or empty | any version |
| `1` or `1.x` | `>=1.0.0 <2.0.0` |
| `1.2` or `1.2.x` | `>=1.2.0 <1.3.0` |

With an operator, a partial version is filled in so that the comparison stays meaningful:

| range | means |
|---|---|
| `>1` | `>=2.0.0` |
| `>1.2` | `>=1.3.0` |
| `>=1` / `>=1.2` | `>=1.0.0` / `>=1.2.0` |
| `<1` / `<1.2` | `<1.0.0` / `<1.2.0` |
| `<=1` / `<=1.2` | `<2.0.0` / `<1.3.0` |
| `=1` / `=1.2` | same as `1` / `1.2` |

### Tilde: allows patch-level changes

| range | means |
|---|---|
| `~1.2.3` | `>=1.2.3 <1.3.0` |
| `~1.2` | `>=1.2.0 <1.3.0` |
| `~1` | `>=1.0.0 <2.0.0` |
| `~1.2.3-beta.2` | `>=1.2.3-beta.2 <1.3.0` |

### Caret: allows changes that do not modify the left-most non-zero part

| range | means |
|---|---|
| `^1.2.3` | `>=1.2.3 <2.0.0` |
| `^0.2.3` | `>=0.2.3 <0.3.0` |
| `^0.0.3` | `>=0.0.3 <0.0.4` |
| `^1.2` / `^1` | `>=1.2.0 <2.0.0` / `>=1.0.0 <2.0.0` |
| `^0.2` | `>=0.2.0 <0.3.0` |
| `^0.0` | `>=0.0.0 <0.1.0` |
| `^0` or `^0.x` | `>=0.0.0 <1.0.0` |
| `^1.2.3-beta.2` | `>=1.2.3-beta.2 <2.0.0` |

### Hyphen ranges

`A - B` (spaces around the hyphen are required) means `>=A <=B`. A partial `A` is filled with zeros. A partial `B` matches anything in that partial version:

| range | means |
|---|---|
| `1.2.3 - 2.3.4` | `>=1.2.3 <=2.3.4` |
| `1.2 - 2.3.4` | `>=1.2.0 <=2.3.4` |
| `1.2.3 - 2.3` | `>=1.2.3 <2.4.0` |
| `1.2.3 - 2` | `>=1.2.3 <3.0.0` |

## Prereleases

A version that has a prerelease satisfies a comparator set only if it satisfies every comparator **and** at least one comparator in that set has a prerelease on the **same** `MAJOR.MINOR.PATCH`.

- `1.2.3-alpha.7` satisfies `>1.2.3-alpha.3`
- `3.4.5-alpha.9` does **not** satisfy `>1.2.3-alpha.3` (different tuple), even though it is greater
- `1.2.4-beta` does **not** satisfy `^1.2.3`, and no prerelease satisfies `*`
