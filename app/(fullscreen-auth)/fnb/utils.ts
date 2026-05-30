export const formatDuration = (startOrSeconds: Date | number, current?: Date) => {
    if (typeof startOrSeconds === 'number') {
        const safeSeconds = Math.max(0, startOrSeconds);
        const hours = Math.floor(safeSeconds / 3600);
        const mins = Math.floor((safeSeconds % 3600) / 60);
        const secs = Math.floor(safeSeconds % 60);
        return `${hours}g${mins}p${secs}s`;
    }
    if (!current) return "0g0p";
    const diffMs = Math.max(0, current.getTime() - startOrSeconds.getTime());
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}g${mins}p`;
};

export const playTingSound = () => {
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Sound play prevented:', e));
    } catch (error) {
        console.error('Audio playback error:', error);
    }
};
