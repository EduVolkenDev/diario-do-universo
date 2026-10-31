import { entryLabels, type Entry } from '../lib/entries';
import { dailyRevisit, revisitCandidates, type Revisit } from '../lib/revisit';
import { parsePduReading } from '../lib/pdu-transfer';
import { friendlyDataError, journeyOf, normalizeSearch, reflectionLabels, statusLabels, validateReflection, type Reflection, type ReflectionKind } from '../lib/journey';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));

export type JourneyViewState = {
  ownerId: string | null;
  entries: Entry[];
  reflections: Reflection[];
  loading: boolean;
  entriesError: string;
  reflectionsError: string;
};

export function createJourneyView(callbacks: {
  save: (draft: { id: string; entry_id: string; kind: ReflectionKind; body: string }) => Promise<Reflection>;
  saved: (reflection: Reflection) => void;
  remove: (id: string) => Promise<void>;
  retry: () => void;
}) {
  let state: JourneyViewState = { ownerId: null, entries: [], reflections: [], loading: false, entriesError: '', reflectionsError: '' };
  let activeId: string | null = null;
  let saving = false;
  let epoch = 0;
  let retryDraft: { signature: string; id: string } | null = null;
  let revisitId: string | null = null;
  let revisitDay = '';
  let currentRevisit: Revisit | undefined;
  let completedRevisit: { title: string; body: string; kind: ReflectionKind; entryId: string } | null = null;
  let activeRevisit = false;
  let returnFocus: HTMLElement | null = null;
  const dialog = $<HTMLDialogElement>('#journey-dialog');
  const form = $<HTMLFormElement>('#reflection-form');
  const body = $<HTMLTextAreaElement>('#reflection-body');
  const kind = $<HTMLSelectElement>('#reflection-kind');
  const save = $<HTMLButtonElement>('#reflection-save');
  const search = $<HTMLInputElement>('#entry-search');
  const filter = $<HTMLSelectElement>('#entry-status');
  let reflectionIndex = new Map<string, Reflection[]>();
  let journeyIndex = new Map<string, ReturnType<typeof journeyOf>>();
  const reflectionsFor = (id: string) => reflectionIndex.get(id) ?? [];
  const journey = (id: string) => journeyIndex.get(id) ?? journeyOf([]);
  const badge = (id: string) => state.reflectionsError ? '<span class="journey-status">Histórico indisponível</span>' : `<span class="journey-status status-${journey(id).status}">${statusLabels[journey(id).status]}</span>`;
  const sourceDetails = (entry: Entry) => {
    const source = parsePduReading(entry.source);
    if (!source) return '';
    return `<section class="pdu-reading-source" aria-label="Origem da leitura"><span class="label">Guardada do Palavras do Universo</span><p>${escape(source.spreadLabel)}</p>${source.question ? `<p>${escape(source.question)}</p>` : ''}<ul class="pdu-reading-cards">${source.cards.map(card => `<li>${escape(card.position)} · ${escape(card.name)}${card.reversed ? ' (reversa)' : ''}</li>`).join('')}</ul></section>`;
  };

  function render() {
    renderRevisit();
    $('#count').textContent = String(state.entries.length);
    const collection = $('#entries');
    collection.setAttribute('aria-busy', String(state.loading));
    $('#entries-retry').hidden = state.loading || !(state.entriesError || state.reflectionsError);
    filter.disabled = !!state.reflectionsError || state.loading;
    $('#collection-notice').textContent = state.entriesError || state.reflectionsError;
    $('#symbols').innerHTML = [...new Set(state.entries.map(e => entryLabels[e.entry_type]))].map(label => `<span>${escape(label)}</span>`).join('');
    const query = normalizeSearch(search.value.trim());
    const visible = state.entries.filter(entry =>
      (state.reflectionsError || filter.value === 'all' || journey(entry.id).status === filter.value) &&
      normalizeSearch([entry.title, entry.body, ...reflectionsFor(entry.id).map(r => r.body)].join(' ')).includes(query));
    if (state.loading) collection.innerHTML = '<div class="empty loading-state"><span aria-hidden="true">✧</span><p>Reunindo seus sinais…</p></div>';
    else if (state.entriesError) collection.innerHTML = '<div class="empty"><p>Não foi possível abrir sua coleção. Seus registros não foram substituídos nem apagados.</p></div>';
    else if (!state.ownerId) collection.innerHTML = '<div class="empty"><span aria-hidden="true">✧</span><h3>Seu espaço começa aqui.</h3><p>Entre para guardar seus sinais e revisitar o que eles despertaram em você.</p><a class="text-link" href="#composer">Escrever meu primeiro sinal ↗</a></div>';
    else if (!visible.length) collection.innerHTML = state.entries.length ? '<div class="empty"><p>Nenhum sinal neste recorte.</p><button type="button" class="text-link" data-clear-search>Limpar busca e filtro</button></div>' : '<div class="empty"><span aria-hidden="true">✧</span><h3>Algo chamou sua atenção?</h3><p>Guarde o primeiro sinal. O significado pode chegar depois.</p><a class="text-link" href="#composer">Começar um registro ↗</a></div>';
    else collection.innerHTML = visible.map(entry => `<article id="entry-${escape(entry.id)}" class="entry">
      <div class="entry-heading"><small>${entry.source ? 'Leitura · PDU' : escape(entryLabels[entry.entry_type])}</small>${badge(entry.id)}</div>
      <h3><button class="entry-title" data-open-entry="${escape(entry.id)}">${escape(entry.title || 'Um sinal para lembrar')}</button></h3>
      <time datetime="${escape(entry.occurred_at)}">${date(entry.occurred_at)}</time>
      <p class="entry-excerpt">${escape(entry.body)}</p>
      <div class="entry-actions"><button class="text-link" data-open-entry="${escape(entry.id)}">Revisitar${reflectionsFor(entry.id).length ? ` · ${reflectionsFor(entry.id).length} ${reflectionsFor(entry.id).length === 1 ? 'evolução' : 'evoluções'}` : ' e evoluir'} <span aria-hidden="true">↗</span></button><button class="entry-delete" aria-label="Apagar ${escape(entry.title || 'registro')}" data-delete-entry="${escape(entry.id)}">Apagar</button></div>
    </article>`).join('');
    if (!state.loading && !state.entriesError && !state.reflectionsError && state.ownerId) $('#collection-notice').textContent = `${visible.length} de ${state.entries.length} ${state.entries.length === 1 ? 'registro' : 'registros'}`;
    const completed = state.entries.map(entry => ({ entry, ...journey(entry.id) })).filter(item => item.resolution).sort((a, b) => b.resolution!.position - a.resolution!.position);
    $('#learning-count').textContent = state.reflectionsError || state.entriesError || state.loading ? 'Aguardando histórico' : `${completed.length} ${completed.length === 1 ? 'descoberta' : 'descobertas'}`;
    $('#learning-empty').hidden = completed.length > 0 || !!state.reflectionsError || !!state.entriesError || state.loading;
    $('#learning-list').innerHTML = state.reflectionsError || state.entriesError ? '<p class="field-hint">Suas descobertas aparecerão aqui quando o histórico estiver disponível.</p>' : state.loading ? '<p class="field-hint">Reunindo seus aprendizados…</p>' : completed.map(({entry, resolution}) => `<article class="learning-card"><span class="label">${reflectionLabels[resolution!.kind]}</span><h3>${escape(entry.title || 'Um sinal para lembrar')}</h3><p>${escape(resolution!.body)}</p><footer><time datetime="${escape(resolution!.created_at)}">${date(resolution!.created_at)}</time><button class="text-link" data-open-entry="${escape(entry.id)}">Ver o caminho ↗</button></footer></article>`).join('');
    if (activeId && dialog.open) renderTimeline();
  }

  function renderRevisit() {
    const section = $('#revisit');
    const content = $('#revisit-content');
    section.hidden = !state.ownerId || state.loading || !!state.entriesError || !!state.reflectionsError;
    $('#revisit-nav').hidden = section.hidden;
    if (section.hidden) { content.replaceChildren(); currentRevisit = undefined; return; }
    if (completedRevisit) {
      const completed = completedRevisit;
      content.innerHTML = `<p class="revisit-intro">Você voltou a uma experiência e acrescentou o que percebe agora.</p><article class="revisit-memory"><span class="label">Momento guardado · ${reflectionLabels[completed.kind]}</span><h3>${escape(completed.title)}</h3><blockquote>${escape(completed.body)}</blockquote></article><p class="revisit-invitation">Seu caminho ganhou mais uma perspectiva.</p><div class="revisit-actions"><button class="text-link" type="button" data-open-entry="${escape(completed.entryId)}">Ver meu caminho ↗</button><button class="text-link" type="button" data-revisit-done>Voltar aos convites</button><a class="text-link" href="#composer">Guardar algo de hoje ↗</a></div>`;
      return;
    }
    const now = new Date();
    const localDay = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const candidates = revisitCandidates(state.entries, state.reflections, now);
    if (revisitDay !== localDay) { revisitId = null; revisitDay = localDay; }
    currentRevisit = candidates.find(item => item.entry.id === revisitId) ?? dailyRevisit(candidates, localDay);
    revisitId = currentRevisit?.entry.id ?? null;
    if (!currentRevisit) {
      content.innerHTML = `<p class="revisit-intro">${state.entries.length ? 'Seus sinais ainda estão recentes. Dê espaço ao que viveu: depois de sete dias sem uma nova evolução, um deles pode voltar aqui para você olhar de novo.' : 'O primeiro passo é guardar algo que chamou sua atenção. Com o tempo, este espaço vai convidar você a reencontrar seus próprios sinais.'}</p><a class="text-link" href="#composer">${state.entries.length ? 'Guardar o que acontece hoje' : 'Guardar meu primeiro sinal'} ↗</a>`;
      return;
    }
    const { entry, daysSince, prompt } = currentRevisit;
    content.innerHTML = `<p class="revisit-intro">Uma lembrança do seu diário, vista de onde você está agora.</p><article class="revisit-memory"><div class="entry-heading"><span class="label">${escape(entryLabels[entry.entry_type])}</span>${badge(entry.id)}</div><h3>${escape(entry.title || 'Um sinal para lembrar')}</h3><time datetime="${escape(entry.occurred_at)}">Registrado para ${date(entry.occurred_at)}</time><blockquote>${escape(entry.body)}</blockquote><p class="field-hint">${daysSince} dias desde ${reflectionsFor(entry.id).length ? 'a última evolução' : 'este registro'}.</p></article><p class="revisit-invitation">${escape(prompt)}</p><div class="revisit-actions"><button class="primary-button" type="button" data-revisit-entry="${escape(entry.id)}">Revisitar este sinal <span aria-hidden="true">↗</span></button>${candidates.length > 1 ? '<button class="text-link" type="button" data-next-revisit>Ver outro sinal</button>' : ''}</div><p class="field-hint">Você pode apenas reler. Não precisa chegar a uma resposta hoje.</p>`;
  }

  function renderTimeline() {
    const entry = state.entries.find(e => e.id === activeId);
    if (!entry) { dialog.close(); activeId = null; return; }
    $('#journey-title').textContent = entry.title || 'Um sinal para lembrar';
    const { timeline, status } = journey(entry.id);
    $('#journey-content').innerHTML = `${badge(entry.id)}${sourceDetails(entry)}<ol class="journey-timeline"><li class="timeline-original"><span class="label">O primeiro sinal · ${escape(entryLabels[entry.entry_type])}</span><time datetime="${escape(entry.occurred_at)}">${date(entry.occurred_at)}</time><p>${escape(entry.body)}</p></li>${timeline.map(r => `<li class="timeline-${r.kind}"><span class="label">${reflectionLabels[r.kind]}</span><time datetime="${escape(r.created_at)}">${date(r.created_at)}</time><p>${escape(r.body)}</p></li>`).join('')}</ol>${state.reflectionsError ? '<p class="data-warning">O histórico está indisponível. Recarregue a coleção antes de adicionar uma evolução.</p>' : ''}`;
    form.hidden = !!state.reflectionsError || state.loading;
    const reopen = kind.querySelector<HTMLOptionElement>('[value="reopened"]')!;
    reopen.disabled = status === 'open';
    if (status === 'open' && kind.value === 'reopened') kind.value = 'evolution';
  }

  function open(id: string, prompt?: string) {
    if (!state.entries.some(entry => entry.id === id)) return;
    if (dialog.open && !close()) return;
    activeId = id;
    activeRevisit = !!prompt;
    returnFocus = document.activeElement instanceof window.HTMLElement ? document.activeElement : null;
    form.reset();
    retryDraft = null;
    $('#reflection-notice').textContent = '';
    $('#revisit-question').hidden = !prompt;
    $('#revisit-prompt').textContent = prompt ?? '';
    updateForm();
    renderTimeline();
    dialog.showModal();
  }

  function close() {
    if (saving) return false;
    if (body.value.trim() && !window.confirm('Descartar a reflexão ainda não guardada?')) return false;
    dialog.close();
    activeId = null;
    form.reset();
    if (returnFocus?.isConnected) returnFocus.focus();
    else $('#revisit-content [data-revisit-entry]')?.focus();
    return true;
  }

  function updateForm() {
    const labels: Record<ReflectionKind, string> = { evolution: 'Guardar evolução', conclusion: 'Guardar conclusão', learning: 'Guardar aprendizado', reopened: 'Reabrir assunto' };
    const prompts: Record<ReflectionKind, string> = { evolution: 'O que aconteceu desde aquele registro? O que você percebe agora?', conclusion: 'O que se esclareceu? Como você encerra este assunto por agora?', learning: 'O que esta experiência ensinou? O que você quer levar com você?', reopened: 'O que fez você olhar para este assunto de novo?' };
    save.textContent = saving ? 'Guardando…' : labels[kind.value as ReflectionKind];
    save.disabled = saving || !body.value.trim();
    body.disabled = saving;
    kind.disabled = saving;
    body.placeholder = prompts[kind.value as ReflectionKind];
    $('#reflection-length').textContent = `${body.value.length.toLocaleString('pt-BR')} / 10.000`;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || !activeId || !state.ownerId || state.reflectionsError) return;
    const problem = validateReflection(kind.value, body.value);
    if (problem) { $('#reflection-notice').textContent = problem; return; }
    const signature = JSON.stringify([activeId, kind.value, body.value.trim()]);
    if (retryDraft?.signature !== signature) retryDraft = { signature, id: crypto.randomUUID() };
    const capturedEpoch = epoch;
    saving = true;
    updateForm();
    $('#reflection-notice').textContent = 'Guardando no seu diário…';
    try {
      const reflection = await callbacks.save({ id: retryDraft.id, entry_id: activeId, kind: kind.value as ReflectionKind, body: body.value.trim() });
      if (epoch !== capturedEpoch) return;
      if (activeRevisit) {
        completedRevisit = { title: state.entries.find(entry => entry.id === reflection.entry_id)?.title || 'Um sinal para lembrar', body: reflection.body, kind: reflection.kind, entryId: reflection.entry_id };
      }
      form.reset();
      retryDraft = null;
      callbacks.saved(reflection);
      $('#reflection-notice').textContent = 'Guardado. Este momento agora faz parte do seu caminho.';
    } catch (error) {
      if (epoch === capturedEpoch) $('#reflection-notice').textContent = friendlyDataError(error, 'Não foi possível guardar. Seu texto continua aqui; tente novamente.');
    } finally {
      if (epoch === capturedEpoch) { saving = false; updateForm(); }
    }
  });
  kind.addEventListener('change', updateForm);
  body.addEventListener('input', updateForm);
  $('#journey-close').addEventListener('click', close);
  $('#revisit-write').addEventListener('click', () => body.focus());
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  window.addEventListener('beforeunload', event => {
    if (dialog.open && (body.value.trim() || saving)) event.preventDefault();
  });
  search.addEventListener('input', render);
  filter.addEventListener('change', render);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !dialog.open) renderRevisit();
  });
  $('#entries-retry').addEventListener('click', callbacks.retry);
  document.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLButtonElement>('button');
    if (target?.dataset.openEntry) open(target.dataset.openEntry);
    if (target?.dataset.revisitEntry && currentRevisit?.entry.id === target.dataset.revisitEntry) open(target.dataset.revisitEntry, currentRevisit.prompt);
    if (target?.hasAttribute('data-revisit-done')) {
      completedRevisit = null;
      renderRevisit();
      ($('#revisit-content [data-revisit-entry]') ?? $('#revisit-title')).focus();
    }
    if (target?.hasAttribute('data-next-revisit')) {
      const candidates = revisitCandidates(state.entries, state.reflections);
      const index = candidates.findIndex(item => item.entry.id === revisitId);
      revisitId = candidates[(index + 1) % candidates.length]?.entry.id ?? null;
      renderRevisit();
      $('#revisit-content [data-revisit-entry]')?.focus();
    }
    if (target?.dataset.deleteEntry) {
      target.disabled = true;
      void callbacks.remove(target.dataset.deleteEntry).finally(() => { target.disabled = false; });
    }
    if (target?.hasAttribute('data-clear-search')) { search.value = ''; filter.value = 'all'; render(); search.focus(); }
  });
  return {
    open,
    update(next: JourneyViewState) {
      if (state.ownerId !== next.ownerId) {
        epoch++;
        saving = false;
        dialog.close();
        activeId = null;
        form.reset();
        retryDraft = null;
        revisitId = null;
        completedRevisit = null;
        activeRevisit = false;
        revisitDay = '';
        returnFocus = null;
        $('#revisit-question').hidden = true;
        $('#revisit-prompt').textContent = '';
        search.value = '';
        filter.value = 'all';
        $('#journey-content').replaceChildren();
        $('#journey-title').textContent = '';
      }
      state = next;
      reflectionIndex = new Map();
      for (const reflection of state.reflections) {
        const group = reflectionIndex.get(reflection.entry_id) ?? [];
        group.push(reflection);
        reflectionIndex.set(reflection.entry_id, group);
      }
      journeyIndex = new Map([...reflectionIndex].map(([id, items]) => [id, journeyOf(items)]));
      render();
    },
  };
}
