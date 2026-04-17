export const formatDuration = (start: Date, current: Date) => {
    const diffMs = current.getTime() - start.getTime();
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
