const form = document.querySelector("#client-form");
const nameField = document.querySelector("#client-name");
const arrivalField = document.querySelector("#arrival");
const durationField = document.querySelector("#duration");
const statusMessage = document.querySelector("#status");
const table = document.querySelector("#clients-table");
const rows = document.querySelector("#clients");
const emptyList = document.querySelector("#empty-list");
const runFIFO = document.querySelector("#run-fifo");
const fifoResult = document.querySelector("#fifo-result");
const fifoRows = document.querySelector("#fifo-rows");
const comparisonButton = document.querySelector("#run-comparison");
const shortestResult = document.querySelector("#shortest-result");
const shortestRows = document.querySelector("#shortest-rows");
const clients = [];
const stepViews = {};
let nextId = 1;

for (const id of ["fifo", "shortest"]) {
    const container = document.querySelector(`#${id}-steps`);
    const view = {
        schedule: [],
        times: [],
        index: 0,
        status: container.querySelector(".step-status"),
        next: container.querySelector(".step-next")
    };
    stepViews[id] = view;
    view.next.addEventListener("click", () => {
        if (view.index < view.times.length - 1) {
            view.index++;
            renderStep(view);
        }
    });
    container.querySelector(".step-reset").addEventListener("click", () => {
        view.index = 0;
        renderStep(view);
    });
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameField.value.trim();
    const arrival = Number(arrivalField.value);
    const duration = Number(durationField.value);

    if (!name) {
        statusMessage.textContent = "Saisis le nom du client.";
        nameField.focus();
        return;
    }
    if (!arrivalField.value.trim() || !Number.isSafeInteger(arrival) || arrival < 0) {
        statusMessage.textContent = "L’arrivée doit être un nombre entier de minutes, supérieur ou égal à zéro.";
        arrivalField.focus();
        return;
    }
    if (!durationField.value.trim() || !Number.isSafeInteger(duration) || duration <= 0) {
        statusMessage.textContent = "La durée doit être un nombre entier de minutes, supérieur à zéro.";
        durationField.focus();
        return;
    }

    clients.push({ id: nextId++, name, arrival, duration });
    renderClients();
    form.reset();
    statusMessage.textContent = `${name} a été ajouté à la liste.`;
    nameField.focus();
});

function renderClients() {
    clearResults();
    rows.replaceChildren();
    for (const client of clients) {
        const row = document.createElement("tr");
        for (const value of [client.name, client.arrival, client.duration]) {
            const cell = document.createElement("td");
            cell.textContent = String(value);
            row.append(cell);
        }
        const action = document.createElement("td");
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Supprimer";
        remove.setAttribute("aria-label", `Supprimer ${client.name}, client ${client.id}`);
        remove.addEventListener("click", () => {
            const index = clients.findIndex((item) => item.id === client.id);
            if (index === -1) {
                return;
            }
            clients.splice(index, 1);
            renderClients();
            statusMessage.textContent = `${client.name} a été supprimé de la liste.`;
            nameField.focus();
        });
        action.append(remove);
        row.append(action);
        rows.append(row);
    }
    table.hidden = clients.length === 0;
    emptyList.hidden = clients.length > 0;
}

function clearResults() {
    fifoResult.hidden = true;
    fifoRows.replaceChildren();
    shortestResult.hidden = true;
    shortestRows.replaceChildren();
    document.querySelector("#fifo-average").textContent = "";
    document.querySelector("#shortest-average").textContent = "";
    for (const id of ["fifo", "shortest"]) {
        stepViews[id].schedule = [];
        stepViews[id].times = [];
        stepViews[id].index = 0;
        stepViews[id].status.textContent = "";
        stepViews[id].next.disabled = true;
        document.querySelector(`#${id}-timeline`).replaceChildren();
        document.querySelector(`#${id}-timeline-details`).replaceChildren();
    }
}

runFIFO.addEventListener("click", () => runSimulation(false));
comparisonButton.addEventListener("click", () => runSimulation(true));

function runSimulation(compare) {
    clearResults();
    if (clients.length === 0) {
        statusMessage.textContent = "Ajoute au moins un client avant de simuler.";
        return;
    }

    let schedule;
    let shortestSchedule;
    try {
        schedule = simulateFIFO(clients);
        if (compare) {
            shortestSchedule = simulateShortest(clients);
        }
    } catch (error) {
        statusMessage.textContent = error.message;
        return;
    }
    renderSchedule(schedule, fifoRows);
    renderTimeline(schedule, "fifo");
    prepareSteps(schedule, "fifo");
    fifoResult.hidden = false;
    document.querySelector("#fifo-average").textContent = averageLabel(schedule);
    if (compare) {
        renderSchedule(shortestSchedule, shortestRows);
        renderTimeline(shortestSchedule, "shortest");
        prepareSteps(shortestSchedule, "shortest");
        shortestResult.hidden = false;
        document.querySelector("#shortest-average").textContent = averageLabel(shortestSchedule);
    }
    statusMessage.textContent = compare ? "Comparaison terminée sur la même liste de clients." : "Simulation FIFO terminée.";
    document.querySelector("#fifo-title").focus();
}

function averageLabel(schedule) {
    const average = schedule.reduce((mean, client) => mean + client.waiting / schedule.length, 0);
    return `Attente moyenne : ${average.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} min.`;
}

function prepareSteps(schedule, id) {
    const view = stepViews[id];
    view.schedule = schedule;
    view.times = [...new Set([0, ...schedule.flatMap((client) => [client.arrival, client.start, client.end])])]
        .sort((a, b) => a - b);
    view.index = 0;
    renderStep(view);
}

function renderStep(view) {
    if (view.times.length === 0) {
        return;
    }
    const time = view.times[view.index];
    const current = view.schedule.find((client) => client.start <= time && time < client.end);
    const waiting = view.schedule
        .filter((client) => client.arrival <= time && time < client.start)
        .map((client) => client.name);
    const finished = view.index === view.times.length - 1;
    const service = current ? current.name : finished ? "Terminé" : "Guichet libre";
    view.status.textContent = `Heure : ${time} min · Service : ${service} · En attente : ${waiting.join(", ") || "Personne"}`;
    view.next.disabled = finished;
}

function renderSchedule(schedule, target) {
    for (const client of schedule) {
        const row = document.createElement("tr");
        for (const value of [client.name, client.arrival, client.duration, client.start, client.end, client.waiting]) {
            const cell = document.createElement("td");
            cell.textContent = String(value);
            row.append(cell);
        }
        target.append(row);
    }
}

function renderTimeline(schedule, id) {
    const timeline = document.querySelector(`#${id}-timeline`);
    const details = document.querySelector(`#${id}-timeline-details`);
    const total = schedule[schedule.length - 1].end;
    let previousEnd = 0;

    function addSegment(label, start, end, idle) {
        const segment = document.createElement("div");
        const description = `${label} · de ${start} à ${end} min · durée ${end - start} min`;
        segment.className = idle ? "timeline-segment idle" : "timeline-segment";
        segment.style.flexBasis = `${(end - start) / total * 100}%`;
        segment.tabIndex = 0;
        segment.setAttribute("role", "img");
        segment.setAttribute("aria-label", description);
        segment.title = description;
        const item = document.createElement("li");
        item.id = `${id}-segment-${details.children.length}`;
        item.textContent = description;
        segment.setAttribute("aria-describedby", item.id);
        timeline.append(segment);
        details.append(item);
    }

    for (const client of schedule) {
        if (client.start > previousEnd) {
            addSegment("Guichet libre", previousEnd, client.start, true);
        }
        addSegment(client.name, client.start, client.end, false);
        previousEnd = client.end;
    }
}
