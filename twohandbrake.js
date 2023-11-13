const { exec } = require("child_process");
const { readFileSync } = require("fs");
const { resolve, relative, extname, basename } = require("path");
const process = require("process");

/*
 * Execute handbrake cli with preferences.
 *@param {string} input - input videos path.
 *@param {string} output - output video path.
 *@param {string} preset_file - preset json file path.
 *@returns {Promise} stdout, stderror.
 */

function commandSpawn(input = "", output = "", preset_file = "") {
  const cli = "bin/HandbrakeCLI.exe";
  const handbrakeclipath = resolve(cli);

  input = resolve(relative(".", input));
  output = resolve(relative(".", output));
  preset_file = resolve(relative(".", preset_file));

  const presetData = JSON.parse(
    readFileSync(preset_file, { encoding: "utf-8" })
  ).PresetList[0];

  const preset_name = presetData.PresetName;
  const targetFiletype = presetData.FileFormat.split("_")[1];
  const givenFiletype = extname(output).slice(1);

  return new Promise((resolve, reject) => {
    //file type validation
    if (targetFiletype !== givenFiletype) {
      console.log(
        `Output file type is mismatched: ${targetFiletype} in preset, ${givenFiletype} is given (${basename(
          output
        )})`
      );
      output =
        output.slice(0, output.length - givenFiletype.length) + targetFiletype;
      console.log(
        `Changed to relevent filetype and will written as ${basename(output)}`
      );
    }

    const command = `"${handbrakeclipath}" --input "${input}" --output "${output}" --preset-import-file "${preset_file}" --preset "${preset_name}"`;

    /* console.log(command); */

    exec(command, (error, stdout, stderr) => {
      if (!error) {
        resolve({ stdout: stdout, stderr: stderr });
      }
    })
      .on("error", (error) => {
        reject(new Error(error));
      })
      .on("exit", (code, signal) => {
        if (code != 0) {
          reject(
            new Error(`Unexpected result code: ${code} and signal:${signal}`)
          );
        }
      });
  });
}

function killStaleProc() {
  const command = `taskkill /F /IM HandbrakeCLI.exe`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error}`);
      return;
    }
    console.log(`Stale processess are killed.`);
    process.exit(1);
  });
}

process.on("SIGINT", () => {
  killStaleProc();
});

if ((require.main = module)) {
  const input = "test/videos/demo-A.mp4";
  const output = "test/videos/demo-A_out_avi.mp4";
  const preset_file = "test/presets/mp4_av1-L3.json";
  commandSpawn(input, output, preset_file)
    .then((result) => {
      console.log("successfully executed");
    })
    .catch((error) => {
      console.log(error);
    });
}
