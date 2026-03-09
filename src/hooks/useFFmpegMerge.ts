import { useState, useRef, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

interface MergeProgress {
  stage: 'loading' | 'processing' | 'done' | 'error';
  percent: number;
  message: string;
}

export function useFFmpegMerge() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState<MergeProgress | null>(null);

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current && loaded) return;

    setProgress({ stage: 'loading', percent: 0, message: 'Cargando FFmpeg...' });

    const ffmpeg = new FFmpeg();
    ffmpeg.on('progress', ({ progress: p }) => {
      setProgress(prev => prev?.stage === 'processing' 
        ? { ...prev, percent: Math.round(p * 100), message: `Procesando... ${Math.round(p * 100)}%` }
        : prev
      );
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegRef.current = ffmpeg;
    setLoaded(true);
    setProgress(null);
  }, [loaded]);

  const mergeAudioVideo = useCallback(async (
    videoSource: string, // URL or data URI
    audioSource: string, // URL or data URI
  ): Promise<string> => {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg) {
      await loadFFmpeg();
      if (!ffmpegRef.current) throw new Error('Failed to load FFmpeg');
    }
    const ff = ffmpegRef.current!;

    setProgress({ stage: 'processing', percent: 0, message: 'Preparando archivos...' });

    try {
      // Write video file
      const videoData = await fetchFile(videoSource);
      await ff.writeFile('input_video.mp4', videoData);

      // Write audio file
      const audioData = await fetchFile(audioSource);
      // Detect format from data URI or default to mp3
      const audioExt = audioSource.includes('audio/wav') ? 'wav' : 'mp3';
      await ff.writeFile(`input_audio.${audioExt}`, audioData);

      setProgress({ stage: 'processing', percent: 10, message: 'Fusionando audio y vídeo...' });

      // Merge: take video stream from video, audio stream from audio
      // -shortest ensures output length matches the shorter input
      await ff.exec([
        '-i', 'input_video.mp4',
        '-i', `input_audio.${audioExt}`,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-movflags', '+faststart',
        'output.mp4'
      ]);

      setProgress({ stage: 'processing', percent: 90, message: 'Generando archivo...' });

      const outputData = await ff.readFile('output.mp4');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = new Blob([outputData as any], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      // Cleanup temp files
      await ff.deleteFile('input_video.mp4');
      await ff.deleteFile(`input_audio.${audioExt}`);
      await ff.deleteFile('output.mp4');

      setProgress({ stage: 'done', percent: 100, message: '¡Fusión completada!' });
      return url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setProgress({ stage: 'error', percent: 0, message });
      throw err;
    }
  }, [loadFFmpeg]);

  const resetProgress = useCallback(() => setProgress(null), []);

  return { loadFFmpeg, mergeAudioVideo, progress, loaded, resetProgress };
}
