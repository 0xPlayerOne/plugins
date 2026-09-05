# Changelog

## [1.1.3](https://github.com/adea-ai/plugins/compare/v1.1.2...v1.1.3) (2026-09-05)


### Bug Fixes

* **ci:** push catalog snapshot PR with a PAT so checks trigger ([#21](https://github.com/adea-ai/plugins/issues/21)) ([24f48a3](https://github.com/adea-ai/plugins/commit/24f48a3ed7f6ef603f5dbad2b0162d4fd8980eb2))

## [1.1.2](https://github.com/adea-ai/plugins/compare/v1.1.1...v1.1.2) (2026-09-05)


### Bug Fixes

* **ci:** open catalog snapshot PR instead of pushing direct to main ([#18](https://github.com/adea-ai/plugins/issues/18)) ([7e7a258](https://github.com/adea-ai/plugins/commit/7e7a25819b3ce01496aa1eaa054af5caf4245310))

## [1.1.1](https://github.com/adea-ai/plugins/compare/v1.1.0...v1.1.1) (2026-09-05)


### Bug Fixes

* use canonical Apache-2.0 LICENSE text and declare SPDX license ([#16](https://github.com/adea-ai/plugins/issues/16)) ([4b03a39](https://github.com/adea-ai/plugins/commit/4b03a3934eeaf4e4fb4a78a3594d6b780efe3160))

## [1.1.0](https://github.com/adea-ai/plugins/compare/v1.0.1...v1.1.0) (2026-09-05)


### Features

* quarantine upstream fetch failures instead of failing sync ([93e27d5](https://github.com/adea-ai/plugins/commit/93e27d52d3131636501121fe92f73be2877857f4))


### Bug Fixes

* drop dead initializer flagged by no-useless-assignment ([#11](https://github.com/adea-ai/plugins/issues/11)) ([9643bb8](https://github.com/adea-ai/plugins/commit/9643bb8953020e3eff2ff72939f9ee1bb52af046))

## [1.0.1](https://github.com/adea-ai/plugins/compare/v1.0.0...v1.0.1) (2026-09-05)


### Bug Fixes

* **ci:** compare offline regen against fixture snapshots, not live data ([#3](https://github.com/adea-ai/plugins/issues/3)) ([0e9c769](https://github.com/adea-ai/plugins/commit/0e9c7696a835291e87d343812c3cc1d543991e15))

## 1.0.0 (2026-09-05)


### Features

* add automated plugin marketplace ([eb27c46](https://github.com/adea-ai/plugins/commit/eb27c46b1977992fea577fe0af5b13faa8bf8cbf))
* bootstrap marketplace catalog publication ([2f6b859](https://github.com/adea-ai/plugins/commit/2f6b85965817fe791fbd7ccbecb84b3149b7c773))


### Bug Fixes

* **ci:** use published Bun release ([ee4026b](https://github.com/adea-ai/plugins/commit/ee4026b388db6e6b20e11a3eb8f4a1c4671c1a27))
* **publication:** enforce immutable catalog releases ([a2f5325](https://github.com/adea-ai/plugins/commit/a2f5325f81cc9301b5986f241c51d16abebf0294))
* **sync:** authenticate GitHub content fetches ([1649439](https://github.com/adea-ai/plugins/commit/1649439623eab2b3438f3492442e7324f3e3c740))
* **sync:** quarantine unsafe plugin snapshots ([d0c6ffd](https://github.com/adea-ai/plugins/commit/d0c6ffd62d06234090e5663fbdd5e434d561231e))
* **sync:** skip invalid normalized plugin records ([941439f](https://github.com/adea-ai/plugins/commit/941439f21706e92b73d2f9c2a6f505a8cbe7358a))
* **sync:** timestamp live snapshots at retrieval ([8363f83](https://github.com/adea-ai/plugins/commit/8363f839a1bd863feafb62da11f6089e1e3be3a5))
* **workflow:** add bootstrap-only catalog publication ([2fa9677](https://github.com/adea-ai/plugins/commit/2fa9677e1c93ee7e22f1bb390c36248e2d184067))
* **workflow:** fail sync on piped command errors ([47c22e1](https://github.com/adea-ai/plugins/commit/47c22e10bcbe455cff9b2c052199c11509f921ad))
* **workflow:** preserve last-known-good catalog until publish ([aaaa0bd](https://github.com/adea-ai/plugins/commit/aaaa0bd73f15378518b3cf31f5bb34caf0f2f783))
* **workflow:** publish latest asset by filename ([3b3c83a](https://github.com/adea-ai/plugins/commit/3b3c83af8f52f5183b9e06abdee3b2e0b46c4198))
* **workflow:** require stable latest asset ([284a9f9](https://github.com/adea-ai/plugins/commit/284a9f9b100ce75079ee2855b169b6c8160d23b6))


### Performance Improvements

* **sync:** normalize plugins concurrently ([235d9c1](https://github.com/adea-ai/plugins/commit/235d9c161b1577dedb9a750d940e1047e4677e31))
