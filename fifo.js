function simulateFIFO(clients) {
    const ordered = [...clients].sort((a, b) => a.arrival - b.arrival || a.id - b.id);
    let availableAt = 0;
    return ordered.map((client) => {
        const start = Math.max(availableAt, client.arrival);
        const end = start + client.duration;
        if (!Number.isSafeInteger(end)) {
            throw new RangeError("Les horaires dépassent la limite de calcul. Réduis les valeurs saisies.");
        }
        availableAt = end;
        return { ...client, start, end, waiting: start - client.arrival };
    });
}
