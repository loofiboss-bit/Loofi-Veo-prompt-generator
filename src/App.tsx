
const handleSuggestSensoryDetails = useCallback(async () => {
    if (!promptState.environment.trim()) {
        addToast(t.errorValidation, 'error');
        return;
    }
    setIsSuggestingSensoryDetails(true);
    try {
        const suggestion = await geminiService.suggestSensoryDetails(
            promptState.environment,
            promptState.weather,
            promptState.timeOfDay,
            promptState.language,
            promptState.model
        );
        setPromptState({ environmentSensoryDetails: suggestion });
        addToast(t.toastSensoryDetailsSuggested, 'success');
    } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
    } finally {
        setIsSuggestingSensoryDetails(false);
    }
}, [promptState.environment, promptState.weather, promptState.timeOfDay, promptState.language, promptState.model, addToast, setPromptState, t]);
