let processes = [];

const uploaded = localStorage.getItem("uploadedProcesses");
if (uploaded) {
  processes = JSON.parse(uploaded);
  updateTable();
  localStorage.removeItem("uploadedProcesses");
}

document.getElementById("processForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const pid = document.getElementById("pid").value;
  const arrival = +document.getElementById("arrival").value;
  const burst = +document.getElementById("burst").value;
  const priority = +document.getElementById("priority").value || 0;

  processes.push({ pid, arrival, burst, priority });
  updateTable();
  this.reset();
});

document.getElementById("algorithm").addEventListener("change", function () {
  document.getElementById("quantumInput").style.display = this.value === "rr" ? "block" : "none";
});

function updateTable() {
  const tbody = document.querySelector("#processTable tbody");
  tbody.innerHTML = "";
  processes.forEach(p => {
    const row = document.createElement("tr");
    row.innerHTML = <td>${p.priority}</td><td>${p.burst}</td><td>${p.arrival}</td><td>${p.pid}</td>;
    tbody.appendChild(row);
  });
}

function simulate() {
  const algo = document.getElementById("algorithm").value;
  const quantum = +document.getElementById("quantumInput").value || 2;
  const resultDiv = document.getElementById("ganttChart");
  resultDiv.innerHTML = "";

  function generateTable(results) {
    let totalTurnaround = 0;
    let totalWaiting = 0;
    let html = `<table border='1' class='result-table'>
                  <tr>
                    <th>Waiting Time</th>
                    <th>Turnaround Time</th>
                    <th>End Time</th>
                    <th>Start Time</th>
                    <th>Process</th>
                  </tr>`;
    results.forEach(p => {
      totalTurnaround += p.turnaround;
      totalWaiting += p.waiting;
      html += `<tr>
                  <td>${p.waiting}</td>
                  <td>${p.turnaround}</td>
                  <td>${p.end}</td>
                  <td>${p.start}</td>
                  <td>${p.pid}</td>
                </tr>`;
    });
    const avgTurnaround = (totalTurnaround / results.length).toFixed(2);
    const avgWaiting = (totalWaiting / results.length).toFixed(2);
    html += `</table><br>
             <p><strong>Average Turnaround Time:</strong> ${avgTurnaround}</p>
             <p><strong>Average Waiting Time:</strong> ${avgWaiting}</p>`;
    return html;
  }

  if (algo === "fcfs") {
    const sorted = [...processes].sort((a, b) => a.arrival - b.arrival);
    let currentTime = 0;
    const results = [];
    sorted.forEach(p => {
      const start = Math.max(currentTime, p.arrival);
      const end = start + p.burst;
      const turnaround = end - p.arrival;
      const waiting = turnaround - p.burst;
      results.push({ pid: p.pid, start, end, turnaround, waiting });
      currentTime = end;
    });
    resultDiv.innerHTML = generateTable(results);
    drawGanttChart(results);

  } else if (algo === "sjf") {
    const remaining = processes.map(p => ({
      ...p,
      remaining: p.burst,
      start: null,
      end: null
    }));

    const executionLog = [];
    let time = 0;
    const completed = [];

    while (completed.length < processes.length) {
      const available = remaining.filter(p => p.arrival <= time && p.remaining > 0);

      if (available.length === 0) {
        time += 1;
        continue;
      }

      available.sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival);
      const current = available[0];

      if (current.start === null) {
        current.start = time;
      }

      current.remaining -= 1;
      executionLog.push({ pid: current.pid, start: time, end: time + 1 });
      time += 1;

      if (current.remaining === 0) {
        current.end = time;
        completed.push(current);
      }
    }

    const results = processes.map(p => {
      const exec = executionLog.filter(e => e.pid === p.pid);
      const start = exec[0].start;
      const end = exec[exec.length - 1].end;
      const turnaround = end - p.arrival;
      const waiting = turnaround - p.burst;
      return { pid: p.pid, start, end, turnaround, waiting };
    });

    const timeline = [];
    for (let i = 0; i < executionLog.length; i++) {
      const { pid, start, end } = executionLog[i];
      if (timeline.length === 0 || timeline[timeline.length - 1].pid !== pid) {
        timeline.push({ pid, start, end });
      } else {
        timeline[timeline.length - 1].end = end;
      }
    }

    resultDiv.innerHTML = generateTable(results);
    drawGanttChart(timeline);

  } else if (algo === "priority") {
    const remaining = [...processes];
    let currentTime = 0;
    const results = [];
    while (remaining.length > 0) {
      const available = remaining.filter(p => p.arrival <= currentTime);
      if (available.length === 0) {
        currentTime = Math.min(...remaining.map(p => p.arrival));
        continue;
      }
      available.sort((a, b) => b.priority-a.priority);
      const p = available[0];
      const start = currentTime;
      const end = start + p.burst;
      const turnaround = end - p.arrival;
      const waiting = turnaround - p.burst;
      results.push({ pid: p.pid, start, end, turnaround, waiting });
      currentTime = end;
      remaining.splice(remaining.indexOf(p), 1);
    }
    resultDiv.innerHTML = generateTable(results);
    drawGanttChart(results);

  } else if (algo === "rr") {
    const quantumTime = quantum;
    const queue = [...processes].sort((a, b) => a.arrival - b.arrival);
    const readyQueue = [];
    let time = 0;
    const ganttBlocks = [];
    const remainingTime = {};
    queue.forEach(p => remainingTime[p.pid] = p.burst);

    while (queue.length > 0 || readyQueue.length > 0) {
      while (queue.length > 0 && queue[0].arrival <= time) {
        readyQueue.push(queue.shift());
      }

      if (readyQueue.length === 0) {
        time = queue[0].arrival;
        continue;
      }

      const current = readyQueue.shift();
      const execStart = time;
      const execTime = Math.min(quantumTime, remainingTime[current.pid]);
      const execEnd = execStart + execTime;

      ganttBlocks.push({ pid: current.pid, start: execStart, end: execEnd });

      remainingTime[current.pid] -= execTime;
      time = execEnd;

      while (queue.length > 0 && queue[0].arrival <= time) {
        readyQueue.push(queue.shift());
      }

      if (remainingTime[current.pid] > 0) {
        readyQueue.push(current);
      }
    }

    const processMap = {};
    ganttBlocks.forEach(block => {
      if (!processMap[block.pid]) {
        processMap[block.pid] = {
          pid: block.pid,
          start: block.start,
          end: block.end,
          totalExecuted: block.end - block.start,
        };
      } else {
        processMap[block.pid].end = block.end;
        processMap[block.pid].totalExecuted += block.end - block.start;
      }
    });

    const results = Object.values(processMap).map(p => {
      const original = processes.find(pr => pr.pid === p.pid);
      const turnaround = p.end - original.arrival;
      const waiting = turnaround - original.burst;
      return {
        pid: p.pid,
        start: p.start,
        end: p.end,
        turnaround,
        waiting
      };
    });

    resultDiv.innerHTML = generateTable(results);
    drawGanttChart(ganttBlocks);
  }
}

function resetAll() {
  processes = [];
  updateTable();
  document.getElementById("ganttChart").innerText = "";
}


function drawGanttChart(schedule) {
  const chartDiv = document.getElementById("ganttChart");
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.marginTop = "20px";

  schedule.forEach(p => {
    const block = document.createElement("div");
    block.style.flex = (p.end - p.start).toString();
    block.style.border = "1px solid #333";
    block.style.backgroundColor = getColor(p.pid);
    block.style.padding = "5px";
    block.style.textAlign = "center";
    block.innerHTML = <strong>${p.pid}</strong><br><small>${p.end} <- ${p.start}</small>;
    container.appendChild(block);
  });

  chartDiv.appendChild(container);
}

function getColor(pid) {
  
  const colors = {
    P1: "#f28b82",
    P2: "#fbbc04",
    P3: "#ccff90",
    P4: "#a7ffeb",
    P5: "#d7aefb",
    P6: "#fdcfe8",
    P7: "#aecbfa",
  };
  return colors[pid] || "#e0e0e0";
}
