const express = require("express"); /* importam express, un fel de functie */
const path = require("path"); /* importam path */
const fs = require("fs"); /* fs este un modul care ne permite sa lucram cu fisiere */
const sharp = require("sharp");

/* app este un obiect de tip server */
const app = express(); /* cream o aplicatie express, un obiect */


console.log("Folderul proiectului: ", __dirname) /* folderul proiectului, __dirname e o constanta care contine calea absoluta a folderului proiectului */
console.log("Calea fisierului index.js: ", __filename)
console.log("Folder curent de lucru: ", process.cwd()) /* folderul curent de lucru, process e un obiect care contine informatii despre procesul care ruleaza */

/* ejs e un limbaj de template */
app.set("view engine", "ejs") /* setam motorul de template */

obGlobal = { /* obiect global */
    obErori: null, /* definim proprietatile obiectului */
    obImagini: null
}

vect_foldere=["temp", "backup", "temp1"] /* vector de foldere */
for (let folder of vect_foldere) {
    let caleFolder = path.join(__dirname, folder)
    if (! fs.existsSync(caleFolder)) { /* verifica daca folderul exista */
        fs.mkdirSync(caleFolder);
    }
}

function initErori() {
    let continut = fs.readFileSync(path.join(__dirname, "resurse/json/erori.json")).toString("utf-8"); /* citim fisierul erori.json */

    obGlobal.obErori = JSON.parse(continut) /* convertim continutul in obiect */

    obGlobal.obErori.eroare_default.imagine = path.join(obGlobal.obErori.cale_baza, obGlobal.obErori.eroare_default.imagine) /* adaugam calea imaginii la obiectul eroare_default */
    for (let eroare of obGlobal.obErori.info_erori) {/* parcurgem toate erorile */
        eroare.imagine = path.join(obGlobal.obErori.cale_baza, eroare.imagine) /* adaugam calea imaginii la obiectul eroare */
    }
    console.log(obGlobal.obErori) /* afisam obiectul erori */

}

initErori()

function initImagini(){
    var continut= fs.readFileSync(path.join(__dirname,"resurse/json/galerie.json")).toString("utf-8");

    obGlobal.obImagini=JSON.parse(continut);
    let vImagini=obGlobal.obImagini.imagini;//din obiectul de imagini, extragem vectorul de imagini

    let caleAbs=path.join(__dirname,obGlobal.obImagini.cale_galerie);
    let caleAbsMediu=path.join(__dirname,obGlobal.obImagini.cale_galerie, "mediu"); //calea absoluta a folderului mediu in care sunt imagini de dim medii
    if (!fs.existsSync(caleAbsMediu))
        fs.mkdirSync(caleAbsMediu);

    //for (let i=0; i< vErori.length; i++ )
    for (let imag of vImagini){
        [numeFis, ext]=imag.fisier.split("."); //despartim numele fisierului de extensie
        let caleFisAbs=path.join(caleAbs,imag.fisier);
        let caleFisMediuAbs=path.join(caleAbsMediu, numeFis+".webp");//calea absoluta a fisierului mediu, webp e un format de imagine care comprima foarte bine
        sharp(caleFisAbs).resize(300).toFile(caleFisMediuAbs);//redimensionam imaginea la 300px si o salvam in folderul mediu
        imag.fisier_mediu=path.join("/", obGlobal.obImagini.cale_galerie, "mediu",numeFis+".webp" )
        imag.fisier=path.join("/", obGlobal.obImagini.cale_galerie, imag.fisier ) //adaugam calea la fisierul original
        
    }
    console.log(obGlobal.obImagini)
}
initImagini();

function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare = obGlobal.obErori.info_erori.find(function (elem) {
        return elem.identificator == identificator
    }); /* find e metoda de vector */
    if (eroare) { /* daca exista eroare */
        if (eroare.status)
            res.status(identificator) /* daca exista status, setam statusul */
        var titluCustom = titlu || eroare.titlu;
        var textCustom = text || eroare.text;
        var imagineCustom = imagine || eroare.imagine;


    }
    else { /* daca nu exista eroare */
        var err = obGlobal.obErori.eroare_default /* setam eroarea default */
        var titluCustom = titlu || err.titlu; /* daca nu exista titlu, setam titlul default */
        var textCustom = text || err.text; /* daca nu exista text, setam textul default */
        var imagineCustom = imagine || err.imagine; /* daca nu exista imagine, setam imaginea default */


    }
    res.render("pagini/eroare", { //transmit obiectul locals, obiectul locals e un obiect care contine datele care vor fi transmise la pagina ejs
        titlu: titluCustom,
        text: textCustom,
        imagine: imagineCustom
    })

}

app.use("/resurse", express.static(path.join(__dirname, "resurse"))) /* folosim resursele statice */
app.use("/node_modules", express.static(path.join(__dirname, "node_modules"))) /* folosim node_modules ca resurse statice */

app.get(["/", "/index", "/home"], function (req, res) { /* ["/", "/index", "/home"] e pagina principala, oricare din variante ne va duce la pagina principala, req e obiect request si res e obiect response */
    res.render("pagini/index", { ip: req.ip, imagini: obGlobal.obImagini.imagini }); /* renderizeaza fisierul index.ejs */
})

app.get("/favicon.ico", function(req, res){
    res.sendFile(path.join(__dirname, "/resurse/imagini/favicon/favicon.ico"))
})

// app.get("/despre", function(req, res){
//     res.render("pagini/despre");
// })

app.get("/index/a", function (req, res) {
    res.render("pagini/index");
})


app.get("/cerere", function (req, res) { /* /cerere e pagina, cererea e o functie care se executa cand cineva cere o pagina */
    res.send("<p style='color: blue'>Buna ziua</p>") /* trimite un raspuns la cerere */
})

app.get("/abc", function (req, res, next) { /* next e o functie care trece la urmatoarea functie */
    res.write("Data curenta"); /* scrie data curenta, nu se termina, se tot incarca */
    next(); /* trece la urmatoarea functie */
})

app.get("/abc", function (req, res, next) {
    res.write(new Date() + "")
    res.end()
})

app.get("/fisier", function (req, res, next) {
    res.sendFile(path.join(__dirname, "/package.json")); /* trimite fisierul package.json, path.join e o functie care concateneaza calea cu numele fisierului */
})

// new Regex("") sau
app.get(/^\/resurse\/[a-zA-Z0-9_\/]*$/, function (req, res, next) { // \/ e caracter special care inseamna //
    afisareEroare(res, 403);
});


app.get("/*.ejs", function (req, res, next) {
    afisareEroare(res, 400);
});


app.get("/*", function (req, res, next) {
    try {
        res.render("pagini" + req.url, function (err, rezultatRandare) {
            if (err) {
                console.log(err);
                if (err.message.startsWith("Failed to lookup view")) {
                    afisareEroare(res, 404);
                }
                else {
                    afisareEroare(res);
                }
            }
            else {
                console.log(rezultatRandare);
                res.send(rezultatRandare);
            }
        })
    } 
    catch (errRandare) {
        if (errRandare.message.startsWith("Cannot find module")) {
            afisareEroare(res, 404);
        }
        else {
            afisareEroare(res);
        }
    }
    
})

app.listen(8080); /* pornim serverul, 8080 e portul de dns */
console.log("Serverul a pornit")


