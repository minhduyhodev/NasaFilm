import { afterEach, describe, expect, it, vi } from 'vitest';

const loadLogger = async (level) => {
  vi.stubEnv('VITE_LOG_LEVEL', level);
  vi.resetModules();
  return (await import('./logger')).logger;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('logger', () => {
  it('writes info, warning, and error messages at info level', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = await loadLogger('info');

    logger.info('Playback started', { movieId: 7 });
    logger.warn('Playback delayed');
    logger.error('Playback failed', new Error('network'));

    expect(info).toHaveBeenCalledWith(
      expect.stringMatching(/\[INFO\] Playback started$/),
      { movieId: 7 },
    );
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/\[WARN\] Playback delayed$/));
    expect(error).toHaveBeenCalledWith(
      expect.stringMatching(/\[ERROR\] Playback failed$/),
      expect.any(Error),
    );
  });

  it('suppresses messages below the configured level', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = await loadLogger('warn');

    logger.info('Hidden informational message');
    logger.warn('Visible warning');

    expect(info).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
  });

  it('falls back to warning when the configured level is invalid', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = await loadLogger('verbose');

    logger.info('Hidden informational message');
    logger.error('Visible error');

    expect(info).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledOnce();
  });
});
