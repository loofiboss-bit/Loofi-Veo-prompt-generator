import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CREATOR_RECIPES, CREATOR_RECIPE_LABELS } from '@core/config/creatorRecipes';
import { ROUTES } from '@core/config/routes';
import { useCreatorStore } from '@core/store/useCreatorStore';
import { useAppStore } from '@core/store/useAppStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { WelcomeModal } from '@features/onboarding/WelcomeModal';
import './creator.css';
export function StartPage() {
  const { t } = useTranslation('creator');
  const navigate = useNavigate();
  const localFiles = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const state = useCreatorStore();
  const [recipeId, setRecipeId] = useState(
    searchParams.get('mode') === 'music' ? 'ambient-visual' : CREATOR_RECIPES[0].id,
  );
  const [idea, setIdea] = useState(t('start.defaultIdea', 'A small creative moment worth sharing'));
  const [name, setName] = useState(t('start.defaultProjectTitle', 'My short video'));
  const [welcome, setWelcome] = useState(false);
  const [startView, setStartView] = useState(
    localStorage.getItem('creator-default-start-view') === '/studio' ? '/studio' : '/start',
  );
  const currentProjectId = useProjectStore((store) => store.currentProjectId);
  const projects = useProjectStore((store) => store.projects);
  const currentProject = projects.find((project) => project.id === currentProjectId);
  const clips = useAppStore((store) => store.clips);
  const hasTimelineMedia = useAppStore((store) =>
    store.assets.some((asset) => asset.type === 'video' || asset.type === 'audio'),
  );
  const recipe = CREATOR_RECIPES.find((item) => item.id === recipeId)!;
  useEffect(() => {
    void useCreatorStore.getState().initialize();
  }, []);
  const create = async (offline = false, selected = recipe) => {
    if (await state.create(selected, idea, name, offline))
      navigate(offline ? ROUTES.TIMELINE : ROUTES.STUDIO);
  };
  const openProject = async (projectId: string) => {
    if (!(await state.open(projectId))) return;
    const app = useAppStore.getState();
    navigate(
      app.clips.length > 0 ||
        app.assets.some((asset) => asset.type === 'video' || asset.type === 'audio')
        ? ROUTES.TIMELINE
        : ROUTES.STUDIO,
    );
  };
  return (
    <section className="creator-start" aria-labelledby="creator-start-title">
      <header>
        <p className="creator-eyebrow">Loofi Creator Studio</p>
        <h1 id="creator-start-title">{t('start.title', 'Your next creative moment')}</h1>
        <p>
          {t(
            'start.description',
            'Turn an idea into a short video. Work locally, bring your own media, and use AI only when you choose.',
          )}
        </p>
        <div className="space-y-4">
          <input
            ref={localFiles}
            type="file"
            disabled={state.busy}
            multiple
            accept="video/*,audio/*,image/*"
            className="sr-only"
            aria-label={t('v16.chooseMedia', 'Choose local media')}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = '';
              if (files.length)
                void state.createFromFiles(files, name).then((ok) => {
                  if (ok) navigate(ROUTES.TIMELINE);
                });
            }}
          />
          <div
            className="creator-grid"
            role="group"
            aria-label={t('start.goals', 'Choose how to begin')}
          >
            <article>
              <h2>{t('start.ownClipsTitle', 'My clips')}</h2>
              <p>
                {t(
                  'start.ownClipsDescription',
                  'Import a video, audio, or image and edit locally.',
                )}
              </p>
              <button
                className="studio-primary"
                disabled={state.busy}
                onClick={() => localFiles.current?.click()}
              >
                {t('start.ownClips', 'Use my own clips')}
              </button>
            </article>
            <article>
              <h2>{t('start.videoPromptsTitle', 'Video prompts / AI video')}</h2>
              <p>
                {t(
                  'start.videoPromptsDescription',
                  'Shape a prompt, review it, and choose when to generate.',
                )}
              </p>
              <button
                className="studio-primary"
                onClick={() => navigate(`${ROUTES.STUDIO}?mode=video`)}
              >
                {t('start.videoPrompts', 'Open video prompts')}
              </button>
            </article>
            <article>
              <h2>{t('start.musicLyricsTitle', 'Music and lyrics')}</h2>
              <p>
                {t(
                  'start.musicLyricsDescription',
                  'Draft music style and lyrics, then copy or review them.',
                )}
              </p>
              <button
                className="studio-primary"
                onClick={() => navigate(`${ROUTES.STUDIO}?mode=music`)}
              >
                {t('start.musicLyrics', 'Open music and lyrics')}
              </button>
            </article>
          </div>
          <div className="creator-actions">
            <button
              disabled={state.busy}
              onClick={() => document.getElementById('recipe-title')?.focus()}
            >
              {t('recipes.title', 'Browse recipes')}
            </button>
            <button onClick={() => navigate(ROUTES.PROJECTS)}>
              {t('start.continue', 'Continue a project')}
            </button>
            <button onClick={() => setWelcome(true)}>
              {t('start.help', 'Show welcome guide')}
            </button>
          </div>
        </div>
      </header>
      {state.error && <p role="alert">{state.error}</p>}
      {state.notice && <p role="status">{state.notice}</p>}
      {currentProject ? (
        <section
          aria-labelledby="current-project-title"
          className="rounded-xl border border-slate-700 p-4"
        >
          <h2 id="current-project-title">{currentProject.name}</h2>
          <p>
            {clips.length > 0
              ? t('recent.ready', 'Media is available — arrange and export')
              : hasTimelineMedia
                ? t('recent.addMedia', 'Next: arrange your media on the timeline')
                : t('recent.addIdea', 'Next: add your idea')}
          </p>
          <button
            className="studio-primary"
            onClick={() =>
              navigate(clips.length > 0 || hasTimelineMedia ? ROUTES.TIMELINE : ROUTES.STUDIO)
            }
          >
            {clips.length > 0 || hasTimelineMedia
              ? t('recent.continueTimeline', 'Continue in timeline')
              : t('recent.continueStudio', 'Continue in Prompt Studio')}
          </button>
        </section>
      ) : null}
      <section aria-labelledby="recent-projects-title">
        <h2 id="recent-projects-title">{t('recent.title', 'Recent projects')}</h2>
        <div className="creator-grid">
          {state.recent.map(({ project }) => (
            <article key={project.id}>
              <h3>{project.name}</h3>
              <p>
                {t(
                  'v16.openRecent',
                  'Open your project to continue editing or prepare a delivery.',
                )}
              </p>
              <button disabled={state.busy} onClick={() => void openProject(project.id)}>
                {t('start.continue', 'Continue a project')}
              </button>
            </article>
          ))}
        </div>
        {!state.recent.length ? (
          <p>{t('recent.empty', 'Your saved projects will appear here.')}</p>
        ) : null}
      </section>
      <section aria-labelledby="examples-title">
        <h2 id="examples-title" tabIndex={-1}>
          {t('examples.title', 'Try it offline — no account or API key')}
        </h2>
        <p>
          {t(
            'examples.description',
            'Original geometric clips and synthesized audio, free to reuse (CC0). Open, customize and export.',
          )}
        </p>
        <div className="creator-grid">
          {CREATOR_RECIPES.filter((item) => item.exampleId).map((item) => (
            <article key={item.id}>
              <video
                muted
                playsInline
                preload="metadata"
                controls
                src={`${import.meta.env.BASE_URL}creator-examples/${item.exampleId}.mp4`}
              />
              <h3>{t(item.titleKey, CREATOR_RECIPE_LABELS[item.id].title)}</h3>
              <p>{t(item.descriptionKey, CREATOR_RECIPE_LABELS[item.id].description)}</p>
              <button disabled={state.busy} onClick={() => void create(true, item)}>
                {t('examples.open', 'Open example')}
              </button>
            </article>
          ))}
        </div>
      </section>
      <section aria-labelledby="recipe-title">
        <h2 id="recipe-title" tabIndex={-1}>
          {t('recipes.title', 'Start with a creative recipe')}
        </h2>
        <div className="creator-grid">
          {CREATOR_RECIPES.map((item) => (
            <button
              className="creator-recipe"
              key={item.id}
              aria-pressed={recipeId === item.id}
              onClick={() => setRecipeId(item.id)}
            >
              <span className="creator-recipe-art" aria-hidden="true">
                {item.category === 'music' ? '♫' : item.category === 'story' ? '◒' : '▣'}
              </span>
              <strong>{t(item.titleKey, CREATOR_RECIPE_LABELS[item.id].title)}</strong>
              <span>{t(item.descriptionKey, CREATOR_RECIPE_LABELS[item.id].description)}</span>
              <small>
                {item.aspectRatio} · {item.sceneCount} {t('recipes.scenes', 'scenes')}
              </small>
            </button>
          ))}
        </div>
        <div className="creator-editor">
          <label>
            {t('recipes.projectTitle', 'Project title')}
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            {t('recipes.idea', 'Your idea')}
            <textarea value={idea} onChange={(event) => setIdea(event.target.value)} />
          </label>
          <ol>
            {recipe.sceneIdeas.map((scene, index) => (
              <li key={scene}>{t(`recipes.${recipe.id}.scenes.${index}`, scene)}</li>
            ))}
          </ol>
          <p>
            {t(
              'recipes.steps',
              '1. Customize your idea locally. 2. Add your media or generate clips externally. 3. Arrange and export in the desktop app.',
            )}
          </p>
          <p>
            {t(
              'recipes.cost',
              'Recipe drafts are local and free. Provider generation is optional and may have external costs. No generation starts here.',
            )}
          </p>
          <div className="creator-actions">
            <button
              className="studio-primary"
              disabled={state.busy || !name.trim() || !idea.trim()}
              onClick={() => void create()}
            >
              {t('recipes.use', 'Create scene drafts')}
            </button>
            <button
              disabled={state.busy || !name.trim() || !idea.trim()}
              onClick={() => void state.saveTemplate(recipe, idea, name)}
            >
              {t('recipes.save', 'Save customized recipe as template')}
            </button>
          </div>
        </div>
      </section>
      <section aria-labelledby="creator-more-title">
        <h2 id="creator-more-title">{t('start.moreTools', 'More ways to work')}</h2>
        <p>
          {t(
            'start.moreToolsDescription',
            'Offline examples and editable recipes are available when you want a starting point.',
          )}
        </p>
        <div className="creator-actions">
          <button onClick={() => navigate(`${ROUTES.SETTINGS}?tab=creatorStyles`)}>
            {t('style.manageInSettings', 'Manage styles in Settings')}
          </button>
          <button onClick={() => navigate(ROUTES.STUDIO)}>
            {t('start.studio', 'Prompt Studio')}
          </button>
          <button onClick={() => navigate(ROUTES.CREATE)}>
            {t('start.production', 'Production')}
          </button>
        </div>
      </section>
      <footer>
        <label>
          {t('start.defaultView', 'Open the app on')}
          <select
            aria-label={t('start.defaultView', 'Open the app on')}
            value={startView}
            onChange={(event) => {
              setStartView(event.target.value);
              localStorage.setItem('creator-default-start-view', event.target.value);
            }}
          >
            <option value="/start">{t('start.label', 'Start')}</option>
            <option value="/studio">{t('start.studio', 'Prompt Studio')}</option>
          </select>
        </label>
        <button onClick={() => navigate(ROUTES.STUDIO)}>
          {t('start.studio', 'Prompt Studio')}
        </button>
        <button onClick={() => navigate(ROUTES.CREATE)}>
          {t('start.production', 'Production')}
        </button>
      </footer>
      <WelcomeModal isOpen={welcome} onClose={() => setWelcome(false)} />
    </section>
  );
}
