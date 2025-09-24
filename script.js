const dice = new Audio('./assets/sounds/dice.mp3')
const hit1 = new Audio('./assets/sounds/hit1.mp3')
const hit2 = new Audio('./assets/sounds/hit2.mp3')
const drop = new Audio('./assets/sounds/drop.wav')
const pickup = new Audio('./assets/sounds/pickup.wav')
const armorequip = new Audio('./assets/sounds/armor.wav')
const fightstart = new Audio('./assets/sounds/fight.mp3')
const playerdeath = new Audio('./assets/sounds/playerdeath.mp3')
const enemydeath = new Audio('./assets/sounds/enemydeath.ogg')


let attackbonus = 0
let first = true
let counter = 0
let itemholder = ""
let pendingRollResolve = null;
let beginfight = true;
let gościucount = 0;


//###################################
//FIGHT
//###################################

class Character {
    constructor(name, weapon, armor, player = false, shield = true) {
        this.name = name;
        this.weapon = weapon;
        this.armor = armor;
        this.player = player;
        if (shield && weapon.twoHanded) {
            this.shield = false;
        } else {
            this.shield = shield;
        }
        this.baseAC = 10;
        this.health = 20;
        this.AC = this.calculateAC();
    }

    calculateAC() {
        let ac = this.baseAC + this.armor.acBonus;
        if (this.shield) ac += 1;
        return ac;
    }

    async attackRoll() {
        if (!this.player) {
            let roll = rollDice(20);
            if (this.weapon.disadvantage) {
                let secondRoll = rollDice(20);
                roll = Math.min(roll, secondRoll);
            } else if (this.weapon.advantage) {
                let secondRoll = rollDice(20);
                roll = Math.max(roll, secondRoll);
            }
            return roll + this.weapon.attackBonus + this.armor.attackPenalty;
        } else {
            // Wait for player input
            let roll = await waitForPlayerRoll();
            return roll + this.weapon.attackBonus + this.armor.attackPenalty;
        }
    }

    damageRoll() {
        return rollDice(this.weapon.damageDice) + this.weapon.damageBonus;
    }

    updateInvetory(){
        let tool1 = document.getElementById("tool1itemoverlay")
        let tool2 = document.getElementById("tool2itemoverlay")
        let inputweapon = tool1.getAttribute("nazwa")
        let inputarmor = tool2.getAttribute("nazwa")

        weapons.forEach(weaponitem =>{
            if (weaponitem.name == inputweapon){
                let updatedweapon = new Weapon(weaponitem.name, weaponitem.attackBonus + Number(tool1.getAttribute("bonus")), weaponitem.damageDice, weaponitem.damageBonus, weaponitem.advantageAgainst, weaponitem.disadvantage, weaponitem.twoHanded);
                this.weapon = updatedweapon;
            }
        });

        armors.forEach(armoritem => {
            if (armoritem.name == inputarmor){
                let updatedarmor = new Armor(armoritem.name, armoritem.acBonus + Number(tool2.getAttribute("bonus")), armoritem.attackPenalty);
                this.armor = updatedarmor;
                this.AC = this.calculateAC();
            }
        });
    }
}

function waitForPlayerRoll() {
    return new Promise((resolve) => {
        pendingRollResolve = resolve;
    });
}

class Weapon {
    constructor(name, attackBonus, damageDice, damageBonus, advantageAgainst = null, disadvantage = false, twoHanded = false) {
        this.name = name;
        this.attackBonus = attackBonus;
        this.damageDice = damageDice;
        this.damageBonus = damageBonus;
        this.advantage = false;
        this.disadvantage = disadvantage;
        this.advantageAgainst = advantageAgainst;
        this.twoHanded = twoHanded;
    }
}

class Armor {
    constructor(name, acBonus, attackPenalty = 0) {
        this.name = name;
        this.acBonus = acBonus;
        this.attackPenalty = attackPenalty;
    }
}

function rollDice(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

function determineAdvantage(attacker, defender) {
    if (attacker.weapon.name === "Łuk") {
        attacker.weapon.advantage = true;
    } else if (attacker.weapon.advantageAgainst === defender.weapon.name) {
        attacker.weapon.advantage = true;
    }
    if (attacker.weapon.name === "Cep bojowy") {
        defender.weapon.disadvantage = true;
    }
    if (attacker.weapon.advantage && attacker.weapon.disadvantage) {
        attacker.weapon.advantage = false;
        attacker.weapon.disadvantage = false;
    }
    if (defender.weapon.advantage && defender.weapon.disadvantage) {
        defender.weapon.advantage = false;
        defender.weapon.disadvantage = false;
    }
}

async function fight(character1, character2) {
    let log = document.getElementById("log");


    log.innerHTML += `Walka między ${character1.name} a ${character2.name} rozpoczyna się!\n\n`

    let round = 1;

    determineAdvantage(character1, character2);
    determineAdvantage(character2, character1);

    log.innerHTML += `${character1.name} walczy używając ${character1.weapon.name}.<br>`

    if (character1.weapon.advantage){
        log.innerHTML += `${character1.name} ma advantage w tej walce!<br>`
    };
    if (character1.weapon.disadvantage){
        log.innerHTML += `${character1.name} ma disadvantage w tej walce!<br>`
    };

    log.innerHTML += `${character2.name} walczy używając ${character2.weapon.name}.<br>`

    if (character2.weapon.advantage){
        log.innerHTML += `${character2.name} ma advantage w tej walce!<br>`
    };
    if (character2.weapon.disadvantage){
        log.innerHTML += `${character2.name} ma disadvantage w tej walce!<br>`
    }

    log.innerHTML += '<br>'
    log.scrollTop = log.scrollHeight;


    while (character1.health > 0 && character2.health > 0) {

        // Character 1 Attacks
        let attack1 = await character1.attackRoll();

        log.innerHTML += `Runda ${round}:<br>`

        log.innerHTML += `${character1.name} atakuje ${character2.name} (rzucone: ${attack1}, przeciwko AC: ${character2.AC})<br>`

        if (attack1 >= character2.AC) {
            let damage1 = character1.damageRoll();
            character2.health -= damage1;

            log.innerHTML += `${character1.name} trafia i zadaje ${damage1} obrażeń! (${character2.name} ma teraz ${character2.health} HP)<br>`
            attack_hit_enemy();
        } else {

            log.innerHTML += `${character1.name} chybia!<br>`
        }

        if (character2.health <= 0) break;

        // Character 2 Attacks
        let attack2 = await character2.attackRoll();

        log.innerHTML += `${character2.name} atakuje ${character1.name} (rzucone: ${attack2}, przeciwko AC: ${character1.AC})<br>`

        if (attack2 >= character1.AC) {
            let damage2 = character2.damageRoll();
            character1.health -= damage2;

            log.innerHTML += `${character2.name} trafia i zadaje ${damage2} obrażeń! (${character1.name} ma teraz ${character1.health} HP)<br>`
            attack_hit_player();
        } else {

            log.innerHTML += `${character2.name} chybia!<br>`
        }


        log.innerHTML += '<br><br>'
        log.scrollTop = log.scrollHeight;
        round++;
    }

    let winner = character1.health > 0 ? character1.name : character2.name;

    log.innerHTML += `Walka zakończona! Zwycięzcą jest ${winner}!<br><br>`
    beginfight = true;
    if (winner == player.name){
        enemydeath.play();
        player.health = 20;
        gościucount++;
        document.getElementById("d20").src = "./assets/textures/fight.png"
        document.getElementById("enemy").src = "./assets/textures/grobowiec.png"
    }
    else{
        playerdeath.play();
        document.getElementById("d20").src = "./assets/textures/grobowiec.png"
        document.getElementById("d20").removeAttribute("onclick");
        document.getElementById("d20").classList.remove("clickable");
        log.innerHTML += 'Pokonanych przeciwników: ' + gościucount + "<br>"
    }
    log.scrollTop = log.scrollHeight;
}

// Tworzenie ekwipunku
const hands = new Weapon("Dłonie", 0, 1, 0, null, true)
const sword = new Weapon("Miecz", 1, 4, 1, "Włócznia", false);
const axe = new Weapon("Topór", 0, 6, 0, "Miecz", false);
const glaive = new Weapon("Glewia", -1, 10, 0, null, false, true);
const flail = new Weapon("Cep bojowy", 0, 4, 0, null, false, true);
const warhammer = new Weapon("Młot wojenny", 0, 8, 0, "Topór", false, true);
const spear = new Weapon("Włócznia", 2, 4, 2, "Młot wojenny", false, true);
const bow = new Weapon("Łuk", 0, 4, 0, "wszystko", false, true);

const nothing = new Armor("Nic", 0, 0)
const leatherArmor = new Armor("Zbroja skórzana", 1, 2);
const scaleArmor = new Armor("Zbroja łuskowa", 3, 0);
const plateArmor = new Armor("Zbroja szynowa", 5, -2);

const weapons = [hands, sword, axe, glaive, flail, warhammer, spear, bow];
const armors = [nothing, leatherArmor, scaleArmor, plateArmor];

// Tworzenie postaci
const player = new Character("Player", hands, nothing, true);
let gościu

// Rozpoczęcie walki

//###################################
//INVENTORY
//###################################

function roll() {
    shakeWeapon();
    if (beginfight == true){
        beginfight = false;
        let enemyweapon = Math.floor(Math.random() * weapons.length)
        let enemyarmor = Math.floor(Math.random() * armors.length)
        gościu = new Character("Gościu", weapons[enemyweapon], armors[enemyarmor]);
        fight(player, gościu);
        fightstart.play()
        let enemycount = Math.floor(Math.random() * 4) + 1
        document.getElementById("d20").src = "./assets/textures/D20.png"
        document.getElementById("enemy").src = "./assets/textures/enemy" + enemycount + ".png"

        return;
    }
    dice.play();
    const outcome = Math.floor(Math.random() * 20) + 1
    let outcomestr = outcome
    let history = document.getElementById("history").innerHTML
    let attacks = history.split("<br>").length
    if(attacks > 5){
        history = history.split("<br>")
        history.shift()
        history = history.join("<br>")
    }
    if (outcome == 20){
        outcomestr = "<b>" + outcomestr + "</b>"
    }
    if (outcome == 1){
        outcomestr = "<i>" + outcomestr + "</i>"
    }
    history = history + outcomestr + "<br>"

    document.getElementById("history").innerHTML = history

    if (pendingRollResolve) {
        pendingRollResolve(outcome);
        pendingRollResolve = null;
    }
}

function anvil() {
    if (counter == 6){
        return;
    }
    if (first == true){
        first = false;
        selected = document.getElementById("list").value;
        if (selected.includes("Zbroja")){
            document.getElementById(counter + 1).setAttribute("zbroja","true")
        }

        document.getElementById("overlay").src = "./assets/textures/" + selected + ".png"
        document.getElementById("hammer").classList.add("moving-image")
        attackbonus = 0
    }
    else{
        let img = document.querySelector('.moving-image');
        let style = window.getComputedStyle(img);
        let leftValue = style.left;
        let parentWidth = img.parentElement.offsetWidth;
        let leftPercentage = (parseFloat(leftValue) / parentWidth) * 100;
        if (leftPercentage < 20 || leftPercentage > 60){
            hit1.play()
            counter++
            first = true
            document.getElementById("hammer").classList.remove("moving-image")
            document.getElementById(counter).src = "./assets/textures/" + selected + ".png"
            document.getElementById("overlay").src = ""
            document.getElementById(counter).setAttribute("locked","false")
            document.getElementById(counter).setAttribute("bonus",attackbonus)
            document.getElementById(counter).setAttribute("title","bonus: " + attackbonus)
            document.getElementById(counter).setAttribute("nazwa",selected)
        }
        if (leftPercentage > 20 && leftPercentage < 35 || leftPercentage > 45 && leftPercentage < 60){
            hit1.play()
            counter++;
            attackbonus = attackbonus + 1;
            first = true
            document.getElementById("hammer").classList.remove("moving-image")
            document.getElementById(counter).src = "./assets/textures/" + selected + ".png"
            document.getElementById("overlay").src = ""
            document.getElementById(counter).setAttribute("locked","false")
            document.getElementById(counter).setAttribute("bonus",attackbonus)
            document.getElementById(counter).setAttribute("title","bonus: " + attackbonus)
            document.getElementById(counter).setAttribute("nazwa",selected)
        }
        if (leftPercentage > 35 && leftPercentage < 45){
            hit2.play()
            attackbonus = attackbonus + 2;
        }
    }
}

function moveitem(input){
    if(document.getElementById(input).getAttribute("locked") == "false"){
        iszbroja = document.getElementById(input).getAttribute("zbroja")
        itemholder = input;

        let arr = document.getElementsByClassName("itemstyle");
        for(let i = 0; i<6; i++){
            arr[i].removeAttribute("onclick");
        }

        let allElements = document.querySelectorAll('*');

        if (iszbroja == "false"){

            let arr = Array.from(allElements).filter(el => {
                const style = window.getComputedStyle(el);
                return style.borderColor === "red" || style.borderColor === "rgb(255, 0, 0)";
            });
            arr.forEach(el => {
                el.style.border = "none";
            });

            pickup.play();
            document.getElementById(input).style.border = "5px solid red";
            document.getElementById("tool1").setAttribute("onclick","selectitems(this.id)");
            document.getElementById("tool1").classList.add("clickable")
            document.getElementById(input).style.opacity = "0.5";
        }
        else{

            let arr = Array.from(allElements).filter(el => {
                const style = window.getComputedStyle(el);
                return style.borderColor === "blue" || style.borderColor === "rgb(0, 0, 255)";
            });
            arr.forEach(el => {
                el.style.border = "none";
            });

            armorequip.play();
            document.getElementById(input).style.border = "5px solid blue";
            document.getElementById("tool2").setAttribute("onclick","selectitems(this.id)");
            document.getElementById("tool2").classList.add("clickable")
            document.getElementById(input).style.opacity = "0.5";
        }
        document.getElementById(input).style.marginTop = "0px";
        document.getElementById(input).style.marginLeft = "0px";
    }
}

function selectitems(input){
    drop.play();
    let arr = document.getElementsByClassName("itemstyle");
    for(let i = 0; i<6; i++){
        arr[i].setAttribute("onclick","moveitem(this.id)");
        arr[i].style.opacity = "";
    }
    document.getElementById("tool1").removeAttribute("onclick");
    document.getElementById("tool2").removeAttribute("onclick");
    document.getElementById("tool1").classList.remove("clickable")
    document.getElementById("tool2").classList.remove("clickable")
    
    if (beginfight == true){
        let id = input + "itemoverlay"
        let item = document.getElementById(itemholder).src;
        let bonus = document.getElementById(itemholder).getAttribute("bonus");
        let nazwa = document.getElementById(itemholder).getAttribute("nazwa");
        document.getElementById(id).setAttribute("bonus",bonus);
        document.getElementById(id).setAttribute("nazwa",nazwa);
        document.getElementById(id).setAttribute("title","bonus: " + bonus);
        document.getElementById(id).src = item;
        document.getElementById(id).classList.add("small")

        player.updateInvetory();
        }
        else{
            let log = document.getElementById("log");
            log.innerHTML += 'Nie można zmienić ekwipunku podczas walki!<br>'
        }
}

function attack_hit_player() {
    const body = document.querySelector('body');
    body.classList.remove('flash-screen');
    void body.offsetWidth;
    body.classList.add('flash-screen');
    setTimeout(() => {
        body.classList.remove('flash-attack');
    }, 200);
  }

  function attack_hit_enemy() {
    const enemy = document.getElementById('enemy');
    enemy.classList.add('flash-attack');
    setTimeout(() => {
        enemy.classList.remove('flash-attack');
    }, 200);
  }

  function shakeWeapon() {
    const weapon = document.getElementById('tool1itemoverlay');

    weapon.classList.remove('shake');
    void weapon.offsetWidth;
    weapon.classList.add('shake');
}