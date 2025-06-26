// =================================================================
// SECTION 1: MODULE IMPORTS & INITIAL DATABASE SETUP
// =================================================================
// This section imports all necessary Node.js modules and third-party libraries.
// It also initializes the primary database connection using 'pg' and
// tests the custom 'AccesBD' database access module.

const express = require("express"); /* importam express, un fel de functie */
const path = require("path"); /* importam path */
const fs = require("fs"); /* fs este un modul care ne permite sa lucram cu fisiere */
const sharp = require("sharp");
const sass = require("sass");
const ejs = require("ejs"); // Ensure EJS is required
const AccesBD = require("./module_proprii/accesbd.js"); // Import the AccesBD module

// Test the custom database access module (AccesBD)
AccesBD.getInstanta().select({tabel:"prajituri", campuri:["*"]}, function(err, rez){
    console.log("--------------------AccesBD--------------------");
    console.log(rez);
})// Initialize the database connection

const pg = require("pg"); /* importam pg, un modul care ne permite sa lucram cu baza de date postgres */

const Client = pg.Client;

// Configure and establish the main PostgreSQL client connection
client = new Client({
    database: "proiect",
    user: "denis",
    password: "denis",
    host: "localhost",
    port: 5433 // asa zice in proprietatile serverului
});

client.connect(); // Connect to the database

// Perform initial test queries
client.query("select * from prajituri", function (err, rezultat) {
    console.log(err);
    console.log(rezultat);
});

client.query("select * from unnest(enum_range(null::categ_prajitura))", function (err, rezultat) {
    console.log(err);
    console.log(rezultat);
});

// =================================================================
// SECTION 2: EXPRESS APPLICATION SETUP & GLOBAL CONFIGURATION
// =================================================================
// This section creates the Express application instance, sets up the
// view engine (EJS), and defines a global object 'obGlobal' to store
// application-wide configurations and data, such as paths and menu options.

/* app este un obiect de tip server */
const app = express(); /* cream o aplicatie express, un obiect */

// Log essential path information for debugging
console.log("Folderul proiectului: ", __dirname);
console.log("Calea fisierului index.js: ", __filename);
console.log("Folder curent de lucru: ", process.cwd());

app.set("view engine", "ejs"); // Set EJS as the templating engine

// Global object for application-wide settings and data
obGlobal = {
    obErori: null, // Will store error definitions
    obImagini: null, // Will store image gallery data
    folderScss: path.join(__dirname, "resurse/scss"), // Path to SCSS source files
    folderCss: path.join(__dirname, "resurse/css"),   // Path to compiled CSS files
    folderBackup: path.join(__dirname, "backup"),     // Path to backup folder
    optiuniMeniu:null // Will store menu options fetched from the database
};

// Fetch menu options (product types) from the database and store globally
client.query("select * from unnest(enum_range(null::tipuri_produse))", function (err, rezultat) {
    console.log(err);
    console.log("Tipuri produse: ", rezultat);
    obGlobal.optiuniMeniu=rezultat.rows;
});

// =================================================================
// SECTION 3: FILE SYSTEM SETUP (DIRECTORY CREATION)
// =================================================================
// This section ensures that necessary directories (temp, backup) exist,
// creating them if they don't.

vect_foldere = ["temp", "backup", "temp1"]; // Array of directories to ensure existence
for (let folder of vect_foldere) {
    let caleFolder = path.join(__dirname, folder);
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder);
    }
}

// =================================================================
// SECTION 4: SCSS COMPILATION & WATCHER
// =================================================================
// This section defines a function to compile SCSS files to CSS.
// It then compiles all SCSS files at startup and sets up a watcher
// to recompile them automatically when changes are detected.

function compileazaScss(caleScss, caleCss) {
    console.log("cale:", caleCss); // Log the CSS path (can be undefined initially)
    // If caleCss is not provided, derive it from caleScss
    if (!caleCss) {
        let numeFisExt = path.basename(caleScss); // Get filename with extension
        let numeFis = numeFisExt.split(".")[0];   // Get filename without extension
        caleCss = numeFis + ".css";               // Construct CSS filename
    }

    // Ensure SCSS and CSS paths are absolute
    if (!path.isAbsolute(caleScss))
        caleScss = path.join(obGlobal.folderScss, caleScss);
    if (!path.isAbsolute(caleCss))
        caleCss = path.join(obGlobal.folderCss, caleCss);

    // Ensure backup directory for CSS exists
    let caleBackup = path.join(obGlobal.folderBackup, "resurse/css");
    if (!fs.existsSync(caleBackup)) {
        fs.mkdirSync(caleBackup, { recursive: true });
    }

    // Backup existing CSS file before overwriting
    let numeFisCss = path.basename(caleCss);
    if (fs.existsSync(caleCss)) {
        fs.copyFileSync(caleCss, path.join(obGlobal.folderBackup, "resurse/css", numeFisCss));
    }
    // Compile SCSS to CSS with source maps
    rez = sass.compile(caleScss, { "sourceMap": true });
    fs.writeFileSync(caleCss, rez.css); // Write the compiled CSS
}

// Compile all SCSS files in the 'resurse/scss' directory at startup
vFisiere = fs.readdirSync(obGlobal.folderScss);
for (let numeFis of vFisiere) {
    if (path.extname(numeFis) == ".scss") {
        compileazaScss(numeFis); // caleCss is implicitly undefined here, will be derived
    }
}

// Watch the SCSS folder for changes and recompile on change/rename events
fs.watch(obGlobal.folderScss, function (eveniment, numeFis) {
    console.log(eveniment, numeFis); // Log the event and filename
    if (eveniment == "change" || eveniment == "rename") {
        let caleCompleta = path.join(obGlobal.folderScss, numeFis);
        if (fs.existsSync(caleCompleta)) { // Check if the file still exists (relevant for rename)
            compileazaScss(caleCompleta);
        }
    }
});

// =================================================================
// SECTION 5: INITIALIZATION FUNCTIONS (ERRORS & IMAGES)
// =================================================================
// This section defines and calls functions to initialize global data
// structures for error messages and image gallery information by reading
// from JSON files. Image paths are processed, and thumbnails are generated.

function initErori() {
    // Read error definitions from JSON file
    let continut = fs.readFileSync(path.join(__dirname, "resurse/json/erori.json")).toString("utf-8");
    obGlobal.obErori = JSON.parse(continut); // Parse JSON into global error object

    // Prepend base path to default error image
    obGlobal.obErori.eroare_default.imagine = path.join(obGlobal.obErori.cale_baza, obGlobal.obErori.eroare_default.imagine);
    // Prepend base path to all specific error images
    for (let eroare of obGlobal.obErori.info_erori) {
        eroare.imagine = path.join(obGlobal.obErori.cale_baza, eroare.imagine);
    }
    console.log(obGlobal.obErori); // Log loaded error definitions
}

initErori(); // Initialize error data

function initImagini() {
    // Read gallery image definitions from JSON file
    var continut = fs.readFileSync(path.join(__dirname, "resurse/json/galerie.json")).toString("utf-8");
    obGlobal.obImagini = JSON.parse(continut); // Parse JSON into global image object
    let vImagini = obGlobal.obImagini.imagini; // Array of image objects

    let caleAbs = path.join(__dirname, obGlobal.obImagini.cale_galerie); // Absolute path to gallery
    let caleAbsMediu = path.join(__dirname, obGlobal.obImagini.cale_galerie, "mediu"); // Path for medium-sized images
    // Create 'mediu' directory if it doesn't exist
    if (!fs.existsSync(caleAbsMediu))
        fs.mkdirSync(caleAbsMediu);

    // Process each image: generate WebP thumbnail and update paths
    for (let imag of vImagini) {
        [numeFis, ext] = imag.cale_imagine.split("."); // Split filename and extension
        let caleFisAbs = path.join(caleAbs, imag.cale_imagine); // Absolute path to original image
        let caleFisMediuAbs = path.join(caleAbsMediu, numeFis + ".webp"); // Absolute path for WebP thumbnail
        sharp(caleFisAbs).resize(300).toFile(caleFisMediuAbs); // Resize and save as WebP
        // Update image object with paths for template usage
        imag.fisier_mediu = path.join("/", obGlobal.obImagini.cale_galerie, "mediu", numeFis + ".webp");
        imag.fisier = path.join("/", obGlobal.obImagini.cale_galerie, imag.cale_imagine);
    }
    console.log("Imagini incarcate"); // Log confirmation
}

initImagini(); // Initialize image data and generate thumbnails

// =================================================================
// SECTION 6: HELPER FUNCTIONS (IMAGE FILTERING & ERROR DISPLAY)
// =================================================================
// This section contains utility functions:
// - 'filtreazaImaginiPeOra': Filters gallery images based on current time and 'timp' property.
// - 'afisareEroare': Renders a standardized error page.

function filtreazaImaginiPeOra(imagini, oraCurenta) {
    // Filters an array of image objects based on their 'timp' (time) property
    // and the current hour.
    return imagini.filter(imag => {
        try {
            // Handle cases where 'timp' is not a valid string or doesn't contain '-'
            if (typeof imag.timp !== 'string' || !imag.timp.includes('-')) {
                if (imag.timp && imag.timp.toLowerCase() === "permanent") return true; // Always show "permanent" images
                return false; // Invalid 'timp' format
            }
            const [startStr, endStr] = imag.timp.split('-'); // e.g., "08:00-16:00"
            const startHour = parseInt(startStr.split(':')[0], 10);
            const endHour = parseInt(endStr.split(':')[0], 10);
            const endMinute = parseInt(endStr.split(':')[1], 10); // Used for "all day" check

            if (isNaN(startHour) || isNaN(endHour) || isNaN(endMinute)) {
                return false; // Invalid numbers in 'timp'
            }

            // Handle time ranges that span across midnight or represent "all day"
            if (endHour === 0 && startHour !== 0) { // e.g. 22:00-00:00 (means up to midnight)
                return oraCurenta >= startHour;
            }
            if (endHour === 23 && endMinute === 59) { // e.g. 08:00-23:59 (all day from startHour)
                return oraCurenta >= startHour && oraCurenta <= endHour;
            }
            // Standard case: check if current hour is within the start (inclusive) and end (exclusive) hours
            return oraCurenta >= startHour && oraCurenta < endHour;
        } catch (e) {
            // console.error(`Error parsing time for image ${imag.cale_imagine}: ${imag.timp}`, e);
            return false; // Exclude image if any error occurs during time parsing
        }
    });
}

function afisareEroare(res, identificator, titlu, text, imagine) {
    // Renders an error page using 'pagini/eroare.ejs' template.
    // It looks up error details from 'obGlobal.obErori' based on 'identificator'.
    let eroare = obGlobal.obErori.info_erori.find(function (elem) {
        return elem.identificator == identificator;
    });
    if (eroare) {
        if (eroare.status) // If a status code is defined for the error, set it
            res.status(identificator);
        // Use provided title/text/image or fall back to predefined values for the error
        var titluCustom = titlu || eroare.titlu;
        var textCustom = text || eroare.text;
        var imagineCustom = imagine || eroare.imagine;
    }
    else { // If specific error not found, use default error details
        var err = obGlobal.obErori.eroare_default;
        var titluCustom = titlu || err.titlu;
        var textCustom = text || err.text;
        var imagineCustom = imagine || err.imagine;
    }
    // Render the error page
    res.render("pagini/eroare", {
        titlu: titluCustom,
        text: textCustom,
        imagine: imagineCustom
    });
}

// =================================================================
// SECTION 7: EXPRESS MIDDLEWARE
// =================================================================
// This section sets up Express middleware:
// - A middleware to make 'optiuniMeniu' available to all EJS templates.
// - Middleware to serve static files from 'resurse', 'node_modules', and 'temp' directories.

// Middleware to add menu options to 'res.locals' for all routes
app.use("/*", function (req, res, next) {
    res.locals.optiuniMeniu = obGlobal.optiuniMeniu; // Make menu options available in templates
    next(); // Pass control to the next middleware/route handler
})

// Serve static files
app.use("/resurse", express.static(path.join(__dirname, "resurse")));
app.use("/node_modules", express.static(path.join(__dirname, "node_modules")));
app.use("/temp", express.static(path.join(__dirname, "temp"))); // Serve files from temp folder (e.g., dynamically generated CSS)

// =================================================================
// SECTION 8: APPLICATION ROUTES
// =================================================================
// This section defines all the routes for the application, including:
// - Home page, gallery, product listings, individual product pages.
// - Routes for dynamic CSS generation, favicon, and other utility endpoints.
// - Error handling routes for 403, 400, and a catch-all 404.

// Home page route (handles '/', '/index', '/home')
app.get(["/", "/index", "/home"], function (req, res) {
    const currentHourStatic = new Date().getHours(); // Get current hour for static gallery filtering
    // Filter images for the static gallery based on the current time
    const imaginiFiltrateStatic = filtreazaImaginiPeOra(obGlobal.obImagini.imagini, currentHourStatic);

    // --- Logic for animated gallery ---
    let imaginiGalerieAnimataHtml = [];
    let numImaginiAnimHtml = 0;

    // Filter images eligible for the animated gallery
    let imaginiEligibileAnimata;
    if (obGlobal.obImagini.imagini) {
        imaginiEligibileAnimata = obGlobal.obImagini.imagini.filter(img => img["galerie-animata"] === true);
    } else {
        imaginiEligibileAnimata = [];
    }

    // If there are eligible images, select a random number of them
    if (imaginiEligibileAnimata.length > 0) {
        const posibileNumere = [9, 12, 15]; // Possible number of images for animated gallery
        let numAlesHtml = posibileNumere[Math.floor(Math.random() * posibileNumere.length)];
        // Take the minimum of the chosen number and available images
        numImaginiAnimHtml = Math.min(numAlesHtml, imaginiEligibileAnimata.length);

        // Log a warning if not enough images are available for the desired count
        if (numImaginiAnimHtml < numAlesHtml && imaginiEligibileAnimata.length < numAlesHtml) {
            console.warn(`Animated Gallery: Not enough images marked with "galerie-animata: true" for desired count ${numAlesHtml}. Using ${imaginiEligibileAnimata.length}.`);
        }
        // Slice the array to get the selected images
        imaginiGalerieAnimataHtml = imaginiEligibileAnimata.slice(0, numImaginiAnimHtml);
    } else {
        console.warn('Animated Gallery: No images found with "galerie-animata: true".');
    }

    // Render the home page with data for both static and animated galleries
    res.render("pagini/index", {
        ip: req.ip,
        imagini: imaginiFiltrateStatic,
        imagini_anim: imaginiGalerieAnimataHtml,
        num_imagini_anim: numImaginiAnimHtml,
        cale_galerie_base: obGlobal.obImagini.cale_galerie
    });
});

// Favicon route
app.get("/favicon.ico", function (req, res) {
    res.sendFile(path.join(__dirname, "/resurse/imagini/favicon/favicon.ico"));
});

// Static gallery page route
app.get("/galerie", function (req, res) {
    const currentHour = new Date().getHours();
    const imaginiFiltrate = filtreazaImaginiPeOra(obGlobal.obImagini.imagini, currentHour);
    res.render("pagini/galerie", { imagini: imaginiFiltrate });
});

// Route for dynamically generating CSS for the animated gallery
app.get("*/galerie_animata.css", function (req, res) {
    try {
        // Path to the SCSS EJS template
        var sirScssEjsPath = path.join(__dirname, "resurse/scss-ejs/galerie_animata.scss");
        var sirScssEjs = fs.readFileSync(sirScssEjsPath).toString("utf8"); // Read the template

        // Choose a random number of images for the SCSS logic
        const posibileNumere = [9, 12, 15];
        var numarImaginiPentruScss = posibileNumere[Math.floor(Math.random() * posibileNumere.length)];

        // Render the SCSS template with the chosen number of images
        var rezScssRendered = ejs.render(sirScssEjs, { nrimag: numarImaginiPentruScss });

        // Write the rendered SCSS to a temporary file
        var caleScssTemp = path.join(__dirname, "temp/galerie_animata.scss");
        fs.writeFileSync(caleScssTemp, rezScssRendered);

        // Compile the temporary SCSS file to CSS with source maps
        var rezCompilare = sass.compile(caleScssTemp, { sourceMap: true });

        // Write the compiled CSS to a temporary file
        var caleCssTemp = path.join(__dirname, "temp/galerie_animata.css");
        fs.writeFileSync(caleCssTemp, rezCompilare.css);

        // Write the source map if generated
        if (rezCompilare.sourceMap) {
            var caleMapTemp = caleCssTemp + ".map";
            fs.writeFileSync(caleMapTemp, JSON.stringify(rezCompilare.sourceMap));
        }

        // Send the generated CSS file
        res.setHeader("Content-Type", "text/css");
        res.sendFile(caleCssTemp);

    } catch (err) {
        console.error("ERROR in /galerie-animata.css route:", err);
        res.status(500).send("Eroare la generarea CSS-ului pentru galerie.");
    }
});

// Route for the source map of the dynamically generated CSS
app.get("*/galerie_animata.css.map", function (req, res) {
    // This might need adjustment if the map file is also in 'temp'
    res.sendFile(path.join(__dirname, "temp/galerie_animata.css.map")); // Assuming map is also in temp
});

// Example/test routes
app.get("/index/a", function (req, res) {
    res.render("pagini/index"); // Renders the home page again
});

app.get("/cerere", function (req, res) {
    res.send("<p style='color: blue'>Buna ziua</p>"); // Simple HTML response
});

// Example of chained middleware
app.get("/abc", function (req, res, next) {
    res.write("Data curenta");
    next();
});
app.get("/abc", function (req, res, next) {
    res.write(new Date() + "");
    res.end();
});

// Route to send the package.json file
app.get("/fisier", function (req, res, next) {
    res.sendFile(path.join(__dirname, "/package.json"));
});

// Products listing page route (can be filtered by 'tip' query parameter)
app.get("/produse", function(req, res){
    console.log(req.query);
    var conditieQuery=""; // Initialize query condition
    if (req.query.tip){ // If 'tip' filter is provided
        conditieQuery=` where tip_produs='${req.query.tip}'`;
    }

    // Query for category options (for filtering UI)
    queryOptiuni="select * from unnest(enum_range(null::categ_prajitura))";
    client.query(queryOptiuni, function(err, rezOptiuni){
        console.log(rezOptiuni);
        if (err) {
            console.log(err);
            afisareEroare(res, 2); // Display error if categories can't be fetched
            return;
        }

        // Query for products, applying the filter condition if any
        queryProduse="select * from prajituri" + conditieQuery;
        client.query(queryProduse, function(err, rez){
            if (err){
                console.log(err);
                afisareEroare(res, 2); // Display error if products can't be fetched
            }
            else{
                // Render the products page with product data and category options
                res.render("pagini/produse", {produse: rez.rows, optiuni:rezOptiuni.rows});
            }
        });
    });
});

// Individual product page route (uses product ID from URL parameter)
app.get("/produs/:id", function(req, res){
    console.log(req.params);
    client.query(`select * from prajituri where id=${req.params.id}`, function(err, rez){
        if (err){
            console.log(err);
            afisareEroare(res, 2); // Database or query error
        }
        else{
            if (rez.rowCount==0){ // Product not found
                afisareEroare(res, 404);
            }
            else{ // Product found, render its page
                res.render("pagini/produs", {prod: rez.rows[0]});
            }
        }
    });
});

// Route to block direct access to files in '/resurse/' via URL pattern
app.get(/^\/resurse\/[a-zA-Z0-9_\/]*$/, function (req, res, next) {
    afisareEroare(res, 403); // Forbidden
});

// Route to block direct access to .ejs files
app.get("/*.ejs", function (req, res, next) {
    afisareEroare(res, 400); // Bad Request
});

// Catch-all route for any other requests (attempts to render a page or shows 404)
app.get("/*", function (req, res, next) {
    try {
        // Attempt to render a page based on the URL path
        res.render("pagini" + req.url, function (err, rezultatRandare) {
            if (err) {
                console.log(err);
                if (err.message.startsWith("Failed to lookup view")) { // Specific error for missing EJS file
                    afisareEroare(res, 404); // Not Found
                }
                else { // Other rendering errors
                    afisareEroare(res); // Default error
                }
            }
            else { // If rendering successful, send the result
                console.log(rezultatRandare);
                res.send(rezultatRandare);
            }
        });
    }
    catch (errRandare) { // Catch errors that occur outside the res.render callback
        if (errRandare.message.startsWith("Cannot find module")) { // e.g. if a module required by EJS is missing
            afisareEroare(res, 404);
        }
        else {
            afisareEroare(res);
        }
    }
});

// =================================================================
// SECTION 9: FINAL DIRECTORY SETUP & SERVER START
// =================================================================
// This section ensures specific directories needed for dynamic content
// generation exist and then starts the Express server, listening on port 8080.

// Ensure 'temp' directory exists (might be redundant if already created in SECTION 3)
const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}
// Ensure directory for SCSS EJS templates exists
const scssEjsDir = path.join(__dirname, "resurse/scss-ejs");
if (!fs.existsSync(scssEjsDir)) {
    fs.mkdirSync(scssEjsDir, { recursive: true });
    console.log(`Created directory: ${scssEjsDir}. Place galerie_animata.scss (EJS template) here.`);
}

// Start the Express server
app.listen(8080);
console.log("Serverul a pornit"); // Log server start message