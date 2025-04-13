function goToManual() {
  window.location.href = "index.html";
}

function goToSimulator() {
  window.location.href = "index.html";
}

function uploadFile() {
  document.getElementById("fileInput").click();

  document.getElementById("fileInput").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const lines = e.target.result.trim().split("\n");
      if (lines.length < 4) {
        alert("The file is incomplete or incorrect.");
        return;
      }

      const numProcesses = parseInt(lines[0]);
      const [arrivalMean, arrivalStd] = lines[1].split(/\s+/).map(Number);
      const [burstMean, burstStd] = lines[2].split(/\s+/).map(Number);
      const lambda = parseFloat(lines[3]);

      const processes = [];
      for (let i = 0; i < numProcesses; i++) {
        const arrival = Math.max(0, Math.round(randomNormal(arrivalMean, arrivalStd)));
        const burst = Math.max(1, Math.round(randomNormal(burstMean, burstStd)));
        const priority = randomPoisson(lambda);
        processes.push({
          pid: `P${i + 1}`,
          arrival,
          burst,
          priority
        });
      }

      localStorage.setItem("uploadedProcesses", JSON.stringify(processes));
      window.location.href = "index.html";
    };
    reader.readAsText(file);
  });
}


function randomNormal(mean, stdDev) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const standardNormal = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + stdDev * standardNormal;
}


function randomPoisson(lambda) {
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}
