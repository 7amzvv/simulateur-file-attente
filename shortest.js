function simulateShortest(clients) {
    const remaining = [...clients].sort((a, b) => a.arrival - b.arrival || a.id - b.id);
    const schedule = [];
    let availableAt = 0;

    while (remaining.length > 0) {
        availableAt = Math.max(availableAt, remaining[0].arrival);
        let selected = 0;
        for (let i = 1; i < remaining.length && remaining[i].arrival <= availableAt; i++) {
            if (remaining[i].duration < remaining[selected].duration) {
                selected = i;
            }
        }
        const [client] = remaining.splice(selected, 1);
        const start = availableAt;
        const end = start + client.duration;
        if (!Number.isSafeInteger(end)) {
            throw new RangeError("Les horaires dépassent la limite de calcul. Réduis les valeurs saisies.");
        }
        schedule.push({ ...client, start, end, waiting: start - client.arrival });
        availableAt = end;
    }
    return schedule;
}
