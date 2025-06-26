
window.onload = function () {
    btn = document.getElementById("filtrare");
    btn.onclick = function () {
        let inpNume = document.getElementById("inp-nume").value.trim().toLowerCase()

        let vectRadio = document.getElementsByName("gr_rad")

        let inpCalorii = null
        let minCalorii = null
        let maxCalorii = null
        for (let rad of vectRadio) {
            if (rad.checked) {
                inpCalorii = rad.value
                if (inpCalorii != "toate") {
                    [minCalorii, maxCalorii] = inpCalorii.split(":") //"350:700" -> ["350","700"]
                    minCalorii = parseInt(minCalorii) //"350" -> 350
                    maxCalorii = parseInt(maxCalorii)
                }
                break
            }
        }

        let inpPret = document.getElementById("inp-pret").value

        let inpCategorie = document.getElementById("inp-categorie").value.trim().toLowerCase()

        let produse = document.getElementsByClassName("produs")
        for (let prod of produse) {
            prod.style.display = "none";
            let nume = prod.getElementsByClassName("val-nume")[0].innerHTML.trim().toLowerCase()
            let cond1 = nume.startsWith(inpNume)


            let calorii = parseInt(prod.getElementsByClassName("val-calorii")[0].innerHTML.trim())

            let cond2 = (inpCalorii == "toate" || (minCalorii <= calorii && calorii < maxCalorii))

            let pret = parseFloat(prod.getElementsByClassName("val-pret")[0].innerHTML.trim())
            let cond3 = (inpPret <= pret)

            let categorie = prod.getElementsByClassName("val-categorie")[0].innerHTML.trim().toLowerCase()
            let cond4 = (inpCategorie == "toate" || inpCategorie == categorie)

            if (cond1 && cond2 && cond3 && cond4) {
                prod.style.display = "block";
            }
        }

    }

    document.getElementById("inp-pret").onchange = function () {
        document.getElementById("infoRange").innerHTML = `(${this.value})`
    }

    document.getElementById("resetare").onclick = function () {
        document.getElementById("inp-nume").value = ""

        let produse = document.getElementsByClassName("produs")

        document.getElementById("i_rad4").checked = true;

        for (let prod of produse) {
            prod.style.display = "block";
        }
    }
    document.getElementById("sortCrescNume").onclick = function () {
        sorteaza(1);
    }

    document.getElementById("sortDescrescNume").onclick = function () {
        sorteaza(-1);
    }

    function sorteaza(semn) {
        let produse = document.getElementsByClassName("produs");
        let vProduse = Array.from(produse);
        vProduse.sort(function (a, b) { // a si b sunt <article>

            let pretA = parseFloat(a.getElementsByClassName("val-pret")[0].innerHTML.trim())
            let pretB = parseFloat(b.getElementsByClassName("val-pret")[0].innerHTML.trim())
            if (pretA != pretB) {
                return semn * (pretA - pretB)
            }
            // preturile sunt egale 
            let numeA = a.getElementsByClassName("val-nume")[0].innerHTML.trim().toLowerCase()
            let numeB = b.getElementsByClassName("val-nume")[0].innerHTML.trim().toLowerCase()
            return semn * numeA.localeCompare(numeB)
        })
        for (let prod of vProduse) {
            prod.parentNode.appendChild(prod);
        }

    }

    window.onkeydown = function (e) {
        console.log(e)
        if (e.key == "c" && e.altKey) {
            let produse = document.getElementsByClassName("produs")
            let sumaPreturi = 0
            for (let prod of produse) {
                if (prod.style.display != "none") {
                    let pret = parseFloat(prod.getElementsByClassName("val-pret")[0].innerHTML.trim())
                    sumaPreturi += pret
                }
            }
            if (!document.getElementById("suma_preturi")) {
                let pRezultat = document.createElement("p") // <p></p>
                pRezultat.innerHTML = sumaPreturi // <p>sumaPreturi</p> ca si numar
                pRezultat.id = "suma_preturi"
                let p = document.getElementById("p-suma")
                p.parentElement.insertBefore(pRezultat, p.nextElementSibling);
                setTimeout(function () {
                    let p1 = document.getElementById("suma_preturi")
                    if (p1) p1.remove()
                }, 2000)
            }
        }
    }

}
