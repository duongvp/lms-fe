/** Preserve Live identities and regenerate only criteria affected by a structured guide edit.
 * Mirrors Live chat-jev/dynamic-storage.ts using canonical pair ordering from framework.ts.
 */
export function updatePolicyFramework(config: any, key: string, value: any) {
  const before = config.policy.framework;
  const framework = { ...before, [key]: value };
  const questions = { ...config.rubric.questions };
  if (questions.category?.criteria) {
    const criteria = { ...questions.category.criteria };
    for (const category of framework.categories) {
      const previous = before.categories.find((item: any) => item.code === category.code);
      const pairs = (source: any) => source.pairs.filter((pair: any) => pair.category === category.code && pair.applicable)
        .slice().sort((a: any, b: any) => (a.category + ':' + a.severity).localeCompare(b.category + ':' + b.severity));
      const nextPairs = pairs(framework);
      if (category.definition !== previous?.definition || JSON.stringify(nextPairs) !== JSON.stringify(pairs(before))) {
        criteria[category.code] = [category.definition, ...nextPairs.map((pair: any) => `${pair.severity}: ${pair.criterion}`)].join('\n');
      }
    }
    questions.category = { ...questions.category, criteria };
  }
  if (questions.severity?.criteria) {
    const criteria = { ...questions.severity.criteria };
    for (const level of framework.levels) {
      if (level.instructions !== before.levels.find((item: any) => item.code === level.code)?.instructions) criteria[level.code] = level.instructions;
    }
    questions.severity = { ...questions.severity, criteria };
  }
  return { ...config, policy: { ...config.policy, framework }, rubric: { ...config.rubric, framework, questions } };
}
