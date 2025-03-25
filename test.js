// function f(x,y){
//     console.log(typeof(y))
//     return 2*x
// }
// function f(x){
//     console.log(arguments)
//     return 2*x
// }

// a=10;b=15
// for(i=a;i<=f(b,17);i++)
//     console.log("i="+i)

function f(n) {
    let s1 = "#".repeat(n);
    let s2 = "#" + " ".repeat(n-2) + "#";
    for(i=0;i<n;i++) {
        if (i!=0 && i!=n-1) {
            console.log(s2)
        }
        else {
            console.log(s1)
        }
    }
}

f(4)