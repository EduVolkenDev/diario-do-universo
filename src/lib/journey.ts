export const reflectionLabels = {
  evolution: 'Evolução',
  conclusion: 'Conclusão',
  learning: 'Aprendizado',
  reopened: 'Novo olhar',
} as const;

export type ReflectionKind = keyof typeof reflectionLabels;
export type JourneyStatus = 'open' | 'concluded' | 'learned';
export type Reflection = {
  id: string;
  entry_id: string;
  position: number;
  kind: ReflectionKind;
  body: string;
  created_at: string;
};

export const statusLabels: Record<JourneyStatus, string> = {
  open: 'Em aberto', concluded: 'Concluído', learned: 'Aprendizado',
};

export function journeyOf(reflections: readonly Reflection[]) {
  const timeline = [...reflections].sort((a, b) => a.position - b.position);
  let status: JourneyStatus = 'open';
  let resolution: Reflection | undefined;
  for (const reflection of timeline) {
    if (reflection.kind === 'conclusion' || reflection.kind === 'learning') {
      status = reflection.kind === 'learning' ? 'learned' : 'concluded';
      resolution = reflection;
    } else if (reflection.kind === 'reopened') {
      status = 'open';
      resolution = undefined;
    }
  }
  return { status, resolution, timeline };
}

export function normalizeSearch(value: string) {
  return value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function validateReflection(kind: string, body: string): string | null {
  if (!Object.hasOwn(reflectionLabels, kind)) return 'Escolha como este assunto evoluiu.';
  if (!body.trim()) return 'Conte o que mudou ou o que você aprendeu.';
  if ([...body.trim()].length > 10000) return 'Use até 10.000 caracteres por evolução.';
  return null;
}

export function friendlyDataError(error: unknown, fallback: string): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (['PGRST205', '42P01'].includes(code)) return 'O armazenamento do Diário ainda precisa ser ativado. Seu texto não foi enviado; mantenha esta página aberta e tente novamente após a configuração.';
  if (['42501', 'PGRST301', 'PGRST303'].includes(code)) return 'Não foi possível autorizar esta ação. Entre novamente e tente mais uma vez.';
  return fallback;
}
