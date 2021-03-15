
class Game {

  constructor(x, y, speed, startingPlanets) {
    this.size_x = x;
    this.size_y = y;
    this.speed = speed;
    this.planets = startingPlanets;
    this.cday = 0;
    this.selected = null;
    this.bgStars = [];
    for (let i=0; i<100; i++) {
      this.bgStars.push(new BackgroundStar(x,y));
    }
    this.scaleUI();
  }

  scaleUI() {
    this.widthUI = this.size_x*0.5;
  }

  update() {
    // update planets
    this.planets.forEach(planet => planet.update(this.speed));
    // hacky way to disable all but most recent UIs
    let lastUI = 0;
    this.planets.forEach(planet => {
      lastUI = max(lastUI, planet.lastActive);
    });
    this.planets.forEach(planet => {
      if (planet.lastActive < lastUI) {
        planet.activeUI = false;
      }
    });
    this.bgStars.forEach(star => star.update(this.speed, this.size_x, this.size_y));
    this.cday += 6;
  }

  draw() {
    background(5,5,5);
    this.bgStars.forEach(star => star.draw(this.speed));
    this.planets.forEach(planet => planet.draw(this.widthUI, this.size_x, this.size_y));
    // TODO: draw year, total population
    this.renderStat("Year: ", floor(this.cday/365), this.size_x - 100, this.size_y - 30, 40);
  }

  renderStat(name, val, x, y, space) {
    strokeWeight(0);
    textSize(14);
    textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    fill(235,235,235);
    text(name, x, y);
    text(val.toString(), x+space, y);
  }

  handleClick(p) {
    this.planets.forEach(planet => planet.handleClick(this.spaceCoords(p)));
  }

  handleMove(p) {
    this.planets.forEach(planet => planet.handleMove(this.spaceCoords(p)));
  }

  spaceCoords(p) {
    return [p[0] - (this.size_x-this.widthUI)*0.5 - this.widthUI, p[1] - this.size_y*0.5];
  }

}

class Planet {

  constructor(name, color, position, diameter, visualize, population, nature, industry, products) {
    this.name = name;
    this.color = color;
    this.position = position;
    this.diameter = diameter;
    this.visualize = visualize;
    this.population = population;
    this.nature = nature;
    this.industry = industry;
    this.products = products;
    this.activeUI = false;
    this.lastActive = 0;
    this.hovered = false;
    this.pad = 30;
  }

  update(speed) {
    // births
    const popGrowthRate = 0.001*speed; // TODO: calc this as function of planet conditions
    this.population += poissonSample(this.population*popGrowthRate);
    // deaths
    const popDeathRate = 0.0005*speed;
    this.population -= poissonSample(this.population*popDeathRate);
  }

  draw(widthUI, xw, yw) {
    // draw dot
    push();
    translate((xw-widthUI)*0.5+widthUI,yw*0.5)
    translate(this.position[0], this.position[1]);
    this.visualize(this.diameter, this.color);
    // draw hover, extra, select
    if (this.hovered) {
      rotate(frameCount*0.02);
      noFill();
      stroke(220,220,220);
      strokeWeight(2);
      const outer = this.diameter+10;
      ellipse(0, 0, outer, outer);
      line(0,outer*0.5, 0, outer*0.5+5);
      rotate(PI*2/3);
      line(0,outer*0.5, 0, outer*0.5+5);
      rotate(PI*2/3);
      line(0,outer*0.5, 0, outer*0.5+5);
    }
    pop();
    // draw UI
    if (this.activeUI) {
      const dull = 0.6;
      const avg = -0.33*(this.color[0]*dull+this.color[1]*dull+this.color[2]*dull);
      const lerp = (a,b,x) => x*a+(1.0-x)*b;
      const mix = 0.6;
      fill(lerp(this.color[0], avg, mix), lerp(this.color[1], avg, mix), lerp(this.color[2], avg, mix));
      noStroke();
      rect(this.pad, this.pad, widthUI-this.pad*2, yw-this.pad*2, 10);
      let curY = this.pad*2;
      this.renderTitle(this.name, widthUI*0.5, curY);
      stroke(255,255,255);
      strokeWeight(2);
      curY += 20;
      line(this.pad*2, curY, widthUI-this.pad*2, curY);
      curY += 35;
      this.renderStat("Population", numberWithCommas(this.population), this.pad*3, curY, widthUI*0.5);
    }
  }

  renderTitle(txt, x, y) {
    strokeWeight(0);
    textSize(24);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    fill(235,235,235);
    text("Planet " + txt, x, y);
  }

  renderStat(name, val, x, y, space) {
    strokeWeight(0);
    textSize(14);
    textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    fill(235,235,235);
    text(name, x, y);
    text(val, x+space, y);
  }

  handleClick(p) {
    if (this.checkIntersection(p)) {
      this.activeUI = !this.activeUI;
      if (this.activeUI) {
        this.lastActive = Date.now();
      }
    }
  }

  handleMove(p) {
    this.hovered = this.checkIntersection(p);
  }

  checkIntersection(p) {
    const dx = this.position[0]-p[0];
    const dy = this.position[1]-p[1];
    const dist = Math.sqrt(dx*dx+dy*dy);
    return dist < this.diameter*0.5;
  }

}

class BackgroundStar {

  constructor(x,y) {
    this.x = Math.random()*x;
    this.y = Math.random()*y;
    this.bright = Math.random()*100+100;
    this.size = Math.random()*3+1;
    this.speed = Math.random()*0.15+0.05;
  }

  update(speed, x, y) {
    this.x = (this.x+this.speed) % x;
    this.y = (this.y+this.speed) % y;
  }

  draw() {
    noStroke();
    fill(this.bright,this.bright,this.bright);
    ellipse(this.x, this.y, this.size, this.size);
  }

}

function poissonSample(mean) {
  // from https://stackoverflow.com/questions/1241555/algorithm-to-generate-poisson-and-binomial-random-numbers
  const L = Math.exp(-mean);
  let p = 1.0;
  let k = 0;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function makeErfPlanet() {
  return new Planet(
    "Erf",
    [45, 160, 220],
    [-10,-45],
    30,
    (diameter, col) => {
      fill(col[0], col[1], col[2]);
      noStroke();
      ellipse(0, 0, diameter, diameter);
    },
    200,
    {},
    {},
    {}
  );
}

function makeMuzPlanet() {
  return new Planet(
    "Muz",
    [180, 40, 20],
    [50,70],
    20,
    (diameter, col) => {
      fill(col[0], col[1], col[2]);
      noStroke();
      ellipse(0, 0, diameter, diameter);
    },
    0,
    {},
    {},
    {}
  );
}

let game;

function setup() {
  createCanvas(windowWidth, windowHeight);
  game = new Game(windowWidth, windowHeight, 1.0, [makeErfPlanet(), makeMuzPlanet()]);
}

function mouseClicked() {
  game.handleClick([mouseX, mouseY]);
}

function mouseMoved() {
  game.handleMove([mouseX, mouseY]);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  game.size_x = windowWidth;
  game.size_y = windowHeight;
  game.scaleUI();
}

function draw() {
  game.update();
  game.draw();
  //ellipse(mouseX, mouseY, 30, 30);
}
