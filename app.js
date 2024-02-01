// INCLUDE LIBRARIES
const express = require("express")
const bodyParser = require("body-parser")
const fileUpload = require("express-fileupload")
const { spawn } = require("child_process")
const fs = require("fs")
const { OpenAI } = require("openai")

const app = express()
const client = new OpenAI({
  apiKey: "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",
})

// CONFIGS
const PORT = 5500

// SET TEMPLATING LANGUAGE
app.set("view engine", "ejs")

// USE MIDDLEWARES
app.use(
  fileUpload({
    limits: {
      fileSize: 5_000_000, // 5MB
    },
    abortOnLimit: true,
  })
)
app.use(bodyParser.urlencoded({ extended: true }))

// USE STATIC FOLDERS
app.use(express.static("public"))
// app.use("/uploads", express.static("uploads"))

// ==================== ROUTES ==================== //
// ================== HOME/INDEX ================== //
app.get("/", (req, res) => {
  res.render("pages/index", {
    uploaded_image: Buffer.from(req.query.image || "", "base64").toString(
      "ascii"
    ),
    b64: encodeURIComponent(req.query.image || ""),
    text_file: Buffer.from(req.query.text || "", "base64").toString("ascii"),
  })
})

// ==================== UPLOAD ==================== //
app.post("/upload", (req, res) => {
  // check if there is no image uploaded
  if (!req.files) return res.sendStatus(400)

  const { upload_image } = req.files

  // block non-image files
  if (!/^image/.test(upload_image.mimetype)) return res.sendStatus(400)

  // save image
  upload_image.mv(__dirname + "/public/uploads/" + upload_image.name)

  res.redirect(
    `/?image=${encodeURIComponent(
      Buffer.from(upload_image.name).toString("base64")
    )}`
  )
})

// ====================== OCR ===================== //
app.post("/ocr", async (req, res) => {
  // check if the parameter is somehow undefined
  if (req.query.image == "undefined") res.sendStatus(400)

  // file path of image to analyze
  const _file = Buffer.from(req.query.image, "base64").toString("ascii")
  const _text_file = `${_file.replace(/\.[^/.]+$/, "")}.txt`

  // launch python script for ocr
  const _process = spawn("python", ["ocr.py", `./public/uploads/${_file}`])

  // wait for output and write it to file
  _process.stdout.on("data", (data) => {
    const _output = Buffer.from(data)
      .toString("ascii")
      .replace(/\r?\n|\r/g, " ")
    fs.writeFile(`./public/output/${_text_file}`, _output, (err) => {
      if (err) throw err

      if (fs.existsSync(`./public/output/${_text_file}`)) {
        res.redirect(
          `/?image=${encodeURIComponent(
            req.query.image.replace("\n")
          )}&text=${encodeURIComponent(
            Buffer.from(_text_file).toString("base64")
          )}`
        )
      }
    })
  })
})

// ====================== GPT ===================== //
app.post("/gpt", async (req, res) => {
  const completion = await client.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "Treat everything as notes. Format them to make it more understandable.",
      },
      {
        role: "user",
        content: req.body.textarea,
      },
    ],
    model: "gpt-3.5-turbo",
  })

  const _text_file = `${req.query.text.replace(/\.[^/.]+$/, "")}.gpt`
  fs.writeFile(
    `./public/output/${_text_file}`,
    completion.choices[0].message.content,
    (err) => {
      if (err) throw err
    }
  )

  res.redirect(
    `/notes?text=${encodeURIComponent(
      Buffer.from(_text_file).toString("base64")
    )}`
  )
})

// ===================== NOTES ==================== //
app.get("/notes", (req, res) => {
  res.render("pages/notes", {
    text: Buffer.from(req.query.text || "", "base64").toString("ascii"),
  })
})

app.listen(PORT, () => {
  console.log(`App listening on port: ${PORT}`)
})
