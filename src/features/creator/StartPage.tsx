import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CREATOR_RECIPES, CREATOR_RECIPE_LABELS } from '@core/config/creatorRecipes';
import { ROUTES } from '@core/config/routes';
import { useCreatorStore } from '@core/store/useCreatorStore';
import type { CreatorStyleProfileV1 } from '@core/types/creatorDelivery';
import { useAppStore } from '@core/store/useAppStore';
import { WelcomeModal } from '@features/onboarding/WelcomeModal';
import './creator.css';
const newStyle = (name = 'My style'): CreatorStyleProfileV1 => ({
  schemaVersion: 1,
  id: crypto.randomUUID(),
  name,
  primaryColor: '#173d56',
  textColor: '#ffffff',
  fontFamily: 'Noto Sans',
  creativeDescription: '',
  updatedAt: Date.now(),
});
export function StartPage() {
  const { t } = useTranslation('creator');
  const navigate = useNavigate();
  const localFiles = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const state = useCreatorStore();
  const assets = useAppStore((store) => store.assets);
  const [recipeId, setRecipeId] = useState(
    searchParams.get('mode') === 'music' ? 'ambient-visual' : CREATOR_RECIPES[0].id,
  );
  const [idea, setIdea] = useState(t('start.defaultIdea', 'A small creative moment worth sharing'));
  const [name, setName] = useState(t('start.defaultProjectTitle', 'My short video'));
  const [style, setStyle] = useState(() => newStyle(t('style.defaultName', 'My style')));
  const [previewStyle, setPreviewStyle] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [startView, setStartView] = useState(
    localStorage.getItem('creator-default-start-view') === '/studio' ? '/studio' : '/start',
  );
  const recipe = CREATOR_RECIPES.find((item) => item.id === recipeId)!;
  useEffect(() => {
    void useCreatorStore.getState().initialize();
  }, []);
  const create = async (offline = false, selected = recipe) => {
    if (await state.create(selected, idea, name, offline))
      navigate(offline ? ROUTES.TIMELINE : ROUTES.STUDIO);
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
        <div className="creator-actions">
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
          <button
            className="studio-primary"
            disabled={state.busy}
            onClick={() => localFiles.current?.click()}
          >
            {t('v16.createFromFiles', 'Create from your own clips')}
          </button>
          <button
            className="studio-primary"
            disabled={state.busy}
            onClick={() => document.getElementById('recipe-title')?.focus()}
          >
            {t('start.create', 'Create new')}
          </button>
          <button
            disabled={state.busy}
            onClick={() => document.getElementById('examples-title')?.focus()}
          >
            {t('start.example', 'Try an example')}
          </button>
          <button onClick={() => navigate(ROUTES.PROJECTS)}>
            {t('start.continue', 'Continue a project')}
          </button>
          <button onClick={() => setWelcome(true)}>{t('start.help', 'Show welcome guide')}</button>
        </div>
      </header>
      {state.error && <p role="alert">{state.error}</p>}
      {state.notice && <p role="status">{state.notice}</p>}
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
      <section>
        <h2>{t('recent.title', 'Recent projects')}</h2>
        <div className="creator-grid">
          {state.recent.map(({ project, previewUrl }) => (
            <article key={project.id}>
              {previewUrl && (
                <video muted playsInline preload="metadata" controls src={previewUrl} />
              )}
              <h3>{project.name}</h3>
              <p>
                {t(
                  'v16.openRecent',
                  'Open your project to continue editing or prepare a delivery.',
                )}
              </p>
              <button
                disabled={state.busy}
                onClick={() =>
                  void state.open(project.id).then((ok) => {
                    if (ok)
                      navigate(
                        useAppStore.getState().clips.length ? ROUTES.TIMELINE : ROUTES.STUDIO,
                      );
                  })
                }
              >
                {t('start.continue', 'Continue a project')}
              </button>
            </article>
          ))}
        </div>
        {!state.recent.length && (
          <p>{t('recent.empty', 'Your saved projects will appear here.')}</p>
        )}
      </section>
      <section>
        <h2>{t('style.title', 'My style')}</h2>
        <p>
          {t(
            'style.description',
            'Save your colors, font and creative direction. Applying a style saves a separate snapshot in the project.',
          )}
        </p>
        <div className="creator-actions">
          {state.profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => {
                setStyle(structuredClone(profile));
                setPreviewStyle(false);
              }}
            >
              {profile.name}
            </button>
          ))}
          <button
            onClick={() => {
              setStyle(newStyle(t('style.defaultName', 'My style')));
              setPreviewStyle(false);
            }}
          >
            {t('style.new', 'New style')}
          </button>
        </div>
        <div className="creator-editor">
          <label>
            {t('style.name', 'Style name')}
            <input
              value={style.name}
              onChange={(event) => setStyle({ ...style, name: event.target.value })}
            />
          </label>
          <label>
            {t('style.primary', 'Primary color')}
            <input
              type="color"
              value={style.primaryColor}
              onChange={(event) => setStyle({ ...style, primaryColor: event.target.value })}
            />
          </label>
          <label>
            {t('style.text', 'Text color')}
            <input
              type="color"
              value={style.textColor}
              onChange={(event) => setStyle({ ...style, textColor: event.target.value })}
            />
          </label>
          <label>
            {t('style.font', 'Font')}
            <select
              aria-label={t('style.font', 'Font')}
              value={style.fontFamily}
              onChange={(event) =>
                setStyle({
                  ...style,
                  fontFamily: event.target.value as CreatorStyleProfileV1['fontFamily'],
                })
              }
            >
              <option>Noto Sans</option>
              <option>Noto Serif</option>
            </select>
          </label>
          <label>
            {t('style.logo', 'Logo from media library')}
            <select
              aria-label={t('style.logo', 'Logo from media library')}
              value={style.logoAssetId ?? ''}
              onChange={(event) =>
                setStyle({ ...style, logoAssetId: event.target.value || undefined })
              }
            >
              <option value="">{t('style.noLogo', 'No logo')}</option>
              {assets
                .filter((asset) => asset.type === 'image')
                .map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            {t('style.direction', 'Creative direction')}
            <textarea
              value={style.creativeDescription}
              onChange={(event) => setStyle({ ...style, creativeDescription: event.target.value })}
            />
          </label>
          <div className="creator-actions">
            <button
              disabled={state.busy}
              onClick={() => void state.saveStyle({ ...style, updatedAt: Date.now() })}
            >
              {t('style.save', 'Save style')}
            </button>
            <button onClick={() => setPreviewStyle(true)}>
              {t('style.preview', 'Preview on current project')}
            </button>
          </div>
          {previewStyle && (
            <div>
              <div
                className="creator-style-preview"
                style={{
                  background: style.primaryColor,
                  color: style.textColor,
                  fontFamily: style.fontFamily,
                }}
              >
                {style.logoAssetId && (
                  <img
                    alt={t('style.logoPreview', 'Logo preview')}
                    src={assets.find((asset) => asset.id === style.logoAssetId)?.url}
                  />
                )}
                <strong>{name}</strong>
                <p>{style.creativeDescription}</p>
                <p>{t('style.captionPreview', 'A caption that is easy to read')}</p>
              </div>
              <p>
                {t(
                  'style.confirmDescription',
                  'Apply these colors, font, logo and creative direction to the current project? Existing continuity profiles remain available.',
                )}
              </p>
              <button
                disabled={state.busy}
                onClick={() =>
                  void state.applyStyle({ ...style, updatedAt: Date.now() }).then((ok) => {
                    if (ok) setPreviewStyle(false);
                  })
                }
              >
                {t('style.confirm', 'Apply to this project')}
              </button>
            </div>
          )}
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
