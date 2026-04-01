export const state = {
  categories: [],
  expenses: [],
  summary: null,
  goal: null,
  account: null,
  analytics: null
};

export function setState(patch) {
  Object.assign(state, patch);
}
