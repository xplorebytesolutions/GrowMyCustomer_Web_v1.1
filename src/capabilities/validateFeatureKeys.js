export function validateFeatureKeys(FK, menuItems = []) {
  const allKeys = new Set(Object.values(FK));
  const missing = [];

  function walk(items) {
    for (const it of items) {
      if (it?.featureKey && !allKeys.has(it.featureKey)) {
        missing.push({ label: it.label, featureKey: it.featureKey });
      }
      if (Array.isArray(it.children)) walk(it.children);
    }
  }

  walk(menuItems);

  if (missing.length) {
    console.error("❌ Missing/invalid feature keys:", missing);
    throw new Error(
      "Sidebar featureKey mismatch. Fix FK or SidebarMenu config."
    );
  }
}
