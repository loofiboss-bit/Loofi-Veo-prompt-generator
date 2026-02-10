import { errorLoggingService } from './errorLoggingService';

const INSTALL_FLAG = '__veoGlobalUnhandledRejectionInstalled__';

const toError = (reason: unknown): Error => {
    if (reason instanceof Error) return reason;
    if (typeof reason === 'string') return new Error(reason);

    try {
        return new Error(`Unhandled rejection: ${JSON.stringify(reason)}`);
    } catch {
        return new Error('Unhandled rejection: [unserializable reason]');
    }
};

export function installGlobalUnhandledRejectionHandler(): void {
    if (typeof window === 'undefined') return;

    const windowWithFlag = window as Window & { [INSTALL_FLAG]?: boolean };
    if (windowWithFlag[INSTALL_FLAG]) return;
    windowWithFlag[INSTALL_FLAG] = true;

    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        const error = toError(event.reason);
        void errorLoggingService.logError(error, 'global:unhandledrejection');
    });
}
