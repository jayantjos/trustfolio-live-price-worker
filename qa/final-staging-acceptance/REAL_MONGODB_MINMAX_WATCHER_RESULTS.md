# Real MongoDB min/max and watcher results

**Result: BLOCKED for required genuine-price acceptance. Watcher/controller propagation: UNVERIFIED.**
A real disposable MongoDB is used for the separate reduced deletion test. That does not prove real retailer-driven category bounds.

| Requirement | Result / evidence |
|---|---|
| Genuine price update through actual LivePriceService | BLOCKED: no new successful authenticated Worker quote |
| Actual category controller and watcher execute after that quote | UNVERIFIED |
| Correct category minimum and maximum | UNVERIFIED in connected test |
| Cache invalidation effect | UNVERIFIED; module loading or counters are not substitutes |
| Frontend-facing budget bounds | UNVERIFIED |
| Propagation time and no restart | UNVERIFIED; no production restart was performed |
| Failed live checks cannot alter category bounds | UNVERIFIED for actual category/controller/watcher integration |

The current source is available in the encrypted staging snapshot. Actual ProductController `getProductPriceBounds` first uses persisted category min/max metadata when valid; clearing the two in-process Maps alone does not recompute that metadata. Actual CategoryService `updateCategoryPriceRange` recomputes canonical catalog bounds and saves the category.

The real watcher debounces changes by 6500 ms, consumes Mongo change streams, and periodically refreshes categories. These are source observations, not a measured propagation guarantee. The reduced missing-deletion job's Mongo service is standalone; it does not claim change-stream/watch-loop acceptance. A later genuine watcher acceptance requires a disposable replica set and actual watcher process, a genuine successful quote through LivePriceService, controller calls before/after propagation, and captured frontend bounds.

No controller or watcher was replaced with a stub counter and reported as a real pass. No success price was fabricated to unblock this gate. Production category bounds, watcher and PM2 remain unchanged.
