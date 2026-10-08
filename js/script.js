
const margin = {top: 80, right: 60, bottom: 60, left: 100};
const width = 800;
const height = 600;

const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;
const padding = 30;

let allData = [];
let graphs = [];
let xVar = 'coll', yVar = 'par_pctile' // note, yVar is ALWAYS percentile

// note this is just the default, graph.race is used to control what race the graph has
let initialRace = 'pooled' 

// xScale and yScale index is the same as graphs index
let xScales = [];
let yScales = [];

const gender = ['male', 'female']
const colorScale = ['#4A90E2', '#E88AA8']

// we have elected to not include 'other'
const races = ['pooled', 'white', 'black', 'hisp', 'asian', 'natam']
const readableRaces = ['Pooled Races', 'White', 'Black', 'Hispanic', 'Asian', 'Native American']

const outcomes = ['coll', 'grad', 'has_dad', 'has_mom', 'hours_wk', 'hs', 'jail', 'kir_top01', 'lpov_nbh', 'married', 'teenbrth']
const readableOutcomes = ['Graduated College', 'Has Graduate Degree', 'Has Father', 'Has Mother', 'Hours Child Labor', 'Graduated Highschool', 'Incarcerated', 'Reached 1%' , 'Moved to Rich Neighborhood', 'Married', 'Teen Birth']

const t = 1000; // time for transitions

// SVG created (no groups yet, created and saved within graphs)
const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width)
  .attr("height", height)

function init() {
  d3.csv("data/national_percentile_outcomes.csv")
  .then(
    
    // loop through percentiles in order to fix str into numbers
    data => {
      // get query
      console.log(data)
            
      data.forEach(d => {
        d.par_pctile = +d.par_pctile;

        // loop through outcome options, then loop through races
        outcomes.forEach(outcome => {
          races.forEach(race => {
            const query_male = `${outcome}_${race}_male`
            const query_female = `${outcome}_${race}_female`

            d[query_male] = +d[query_male];
            d[query_female] = +d[query_female];
            }
          )
          // NOTE: currently there are ways to create a new mapping, but let's ask prof if it's worht it to do, or just keep as this
        })
    });

    allData = data

    // these are the intial (init) calls to set up dropdown and checkboxes + create initial graph
    // inside of DropDown and checkBox code is where actual updates are handled with .on('change', ...)
    setupDropDown()
    setupCheckBox()

    createGraph(initialRace)
    // these are called inside of createGraph
    // updateVis()
    addLegend()

  })
  .catch(error => console.error('Error loading data:', error));
}


window.addEventListener('load', init);

function setupDropDown() {
  d3.selectAll('.variable')
    // loop over each dropdown button
    .each(function() {
      d3.select(this).selectAll('outcomeOptions')
      .data(outcomes) // .data loops through options
      .enter() 
      .append('option') 
      .text((d, i) => readableOutcomes[i]) // The displayed text
      .attr("value",d => d) // The actual value used in the code
    })
    // add 'change' in order for it to do anything after intial setting
    // note onchange is for when element val is altered, while change looks at EVENT changing (drop down change)
    // so previous inputs val, this one inputs event
    .on('change', function (event) {
      xVar = d3.select(this).property("value")
      // update chart
      svg.selectAll('.axis').remove()
      svg.selectAll('.label').remove()
      svg.selectAll('.title').remove()
      updateAxes(); 
      updateVis();

      console.log("graph properly deletec, new length: " + graphs.length)
    })

    // without these, it will take all "myOptions" (aka dropdown) class and apply myOptions (WHICH IS GOOD)
    // BUT, it will apply the initial selection as options[0], instead of xVar/yVar/sizeVar initial
    d3.select('#xVariable').property('value', xVar)
}

function setupCheckBox() {
  d3.selectAll('.race')
    // add 'change' in order for it to do anything after intial setting
    // note onchange is for when element val is altered, while change looks at EVENT changing (drop down change)
    // so previous inputs val, this one inputs event
    .on('change', function (event) {
      if(this.checked) {
        console.log('You checked the checkbox:');
        console.log(this.value);

        createGraph(this.value)

      } else {
        console.log('You unchecked the checkbox:');
        console.log(this.value);
        
        // index is here just in case javascript acts similarly to python, 
        // where unexpecte behaviors happen when deleting inside of a foreach loop
        index = 0
        // go through graph list, find list with checkbox's race, and delete it
        graphs.forEach((g, i) => {
          if (g.race == this.value) {
            index = i
          }
        })

        
        // remove from array
        graphs.splice(index, 1)

        // now actually remove from svg
        // grab using index (which is set in createGraph), then .remove
        d3.select(`#graph_${this.value}`).remove()
        svg.selectAll('.axis').remove()
        svg.selectAll('.label').remove()
        svg.selectAll('.title').remove()

        // TODO: currently not working
        recalcSizes()
        updateAxes()
        updateVis()
      }
        
    })
}

function recalcSizes() {
  const width = (innerWidth - padding) / graphs.length 
  console.log("calculated width: " + width)

  // TO BE DETERMINED
  const height = width * .75

  // update all parameters as 
  graphs.forEach((g, i) => {
    // TODO: uh i can't seem to calculate xStart correctly whoops
    xStart = i * (padding + width) + padding 
    // set new center, new innerWidth, new innerHeight, new translate(x, )
    g.property('width', width)
    .property('height', height)
    .property('x', xStart)
    .attr('transform', `translate(${xStart}, ${margin.top})`)

    console.log('id: ' + g.property('id'))
    console.log('race: ' + g.property('race'))
    console.log('width: ' + g.property('width'))
    console.log('height: ' + g.property('height'))
    console.log('x: ' + g.property('x'))
  })

}

function createGraph(race) {

  // new graph is being added, make sure to remove all previous axis + labels + data
  svg.selectAll('.axis').remove()
  svg.selectAll('.label').remove()
  
  const g = svg.append("g")
    .property('id', `graph_${race}`)
    .property('race', `${race}`)

  graphs.push(g)

  // TODO: i don't believe we need this? as the scale should make sure it doesn't extend out of graph area
  // // Clip bars so they cannot extend outside the graph area
  // const clip = g.append("defs")
  //   .append("clipPath")
  //   .attr("id", "chart-clip");

  // clip.append("rect")
  //   .attr("x", g.property('x'))
  //   .attr("y", 0)
  //   .attr("width", g.property('width'))
  //   .attr("height", g.property('height'));

  // console.log(clip.width)
  // console.log(clip.height)

  // Put bars inside the clipped graph area
  const bars = g.append("g").property('id', `graph_${race}_bars`)
    // .attr("clip-path", "url(#chart-clip)");

  recalcSizes()

  updateAxes()
  updateVis()

}

function updateAxes() {
  maxValue = -Infinity

  graphs.forEach(g => {
    const query_male = `${xVar}_${g.property('race')}_male`
    const query_female = `${xVar}_${g.property('race')}_female`
    
    // Find upper end of the range for selected outcomes
    // Find largest value across both genders + all graphs
    const mv = d3.max(allData, d =>
        Math.max(d[query_male], d[query_female])
    );

    if (mv > maxValue) {
      maxValue = mv
    }
  })

  console.log("maxValue Calculated for all graphs: " + maxValue)

  graphs.forEach((g, i) => {

    // Male values will be negative so they extend LEFT
    // Female values stay positive so they extend RIGHT
    const xScale = d3.scaleLinear()
      .domain([-maxValue, maxValue])
      .nice()
      .range([g.property('x'), g.property('width')]);

    xScales[i] = xScale

    // Y-scale range is just 1-100 for the percentiles
    const yScale = d3.scaleLinear()
      .domain([1, 100])
      .range([g.property('height'), 0]);

    yScales[i] = yScale

    // X AXIS
    const xAxis = d3.axisBottom(xScale)
      .ticks(10)
      // .tickFormat(d => Math.abs(d))
      

    // Y AXIS
    const yAxis = d3.axisLeft(yScale)
      .ticks(10)
      .tickFormat(d => {
        label = ''
        if (d == 1) {
          label=`${d}st`
        }
        else if (d == 2) {
          label=`${d}nd`
        }
        else if (d == 3) {
          label=`${d}rd`
        }
        else {
          label=`${d}th`
        }
        return label
      }
    )

    g.append("g")
      .attr(
          "transform",
          `translate(0,${g.property('height')})`
      )
      .attr('class', 'axis')
      .call(xAxis);

    g.append("g")
      .attr(
        "transform",
        `translate(${g.property('x')}, 0)`
      )
      .call(yAxis)
      .attr('class', 'axis');


    // X AXIS name
    g.append("text")
      .attr("x", (g.property('width') / 2) + g.property('x'))
      .attr("y", g.property('height') + 35)
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .style("font-size", "12px")
      .text(xVar)
      .attr('class', 'label');


    // Y AXIS name
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -g.property('height') / 2)
      .attr("y", g.property('x') - 40)
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .style("font-size", "12px")
      .text("Parent income percentile")
      .attr('class', 'label');


    // Graph title
    g.append("text")
      .attr("x", (g.property('width') / 2) + g.property('x'))
      .attr("y", -12)
      .attr("text-anchor", "middle")
      .style("font-size", "15px")
      .style("font-weight", "bold")
      .text(`${readableOutcomes[outcomes.indexOf(xVar)]} by Parent Income Percentile (${g.property('race')})`)
      .attr('class', 'title');
  })
}

function updateVis() {
  graphs.forEach((g, i) => {
    // Set bar height? Revisit to understand
    // This ensures that bars aren't touching (so we add vertical space)
    const barHeight = g.property('height') / allData.length * 0.85;

    console.log("barHeight for " + i + 'th graph:' + barHeight)

    const query_male = `${xVar}_${g.property('race')}_male`
    const query_female = `${xVar}_${g.property('race')}_female`

    // Remove rows where the outcome (column value) is missing
    filteredData = allData.filter(d =>
        Number.isFinite(d[query_male]) &&
        Number.isFinite(d[query_female])
    );

    console.log(filteredData)

    bars = g.select(`#graph_${g.property('race')}_bars`)

    bars.selectAll('.male-bar')
      .data(filteredData)
      .join(
        // When we have new data points
        function(enter){
            console.log("enter")
            return enter

            // create male-bar rectangle
            .append("rect")
            .attr("class", "male-bar")
            // moves from left to zero
            .attr("x", d => xScales[i](-d[query_male]))
            .attr("y", d => yScales[i](d.par_pctile) - barHeight)
            .attr("width", d => xScales[i](0) - xScales[i](-d[query_male]))
            .attr("height", barHeight)
            .attr('fill', '#4A90E2')
        },
        // Update existing points when data changes
        function(update){
            console.log("update")
            return update
            // Smoothly move to new positions/sizes
            .transition(t)

            // update data points (x, y, and size)
            .attr('x', d => xScales[i](-d[query_male]))
            .attr('y', d => yScales[i](d.par_pctile) - barHeight)
            .attr("width", d => xScales[i](0) - xScales[i](-d[query_male]))
        },
        // Remove points that no longer exist in the filtered data 
        function(exit){
            exit
            .remove()
        }
    )

    bars.selectAll('.female-bar')
      .data(filteredData)
      .join(
        // When we have new data points
        function(enter){
            return enter

            // create male-bar rectangle
            .append("rect")
            .attr("class", "female-bar")
            // moves from left to zero
            .attr("x", xScales[i](0))
            .attr("y", d => yScales[i](d.par_pctile) - barHeight)
            .attr("width", d => xScales[i](d[query_female]) - xScales[i](0))
            .attr("height", barHeight)
            .attr('fill', colorScale[1])
        },
        // Update existing points when data changes
        function(update){
            return update
            // Smoothly move to new positions/sizes
            .transition(t)

            // update data points (x, y, and size)
            .attr("x", xScales[i](0))
            .attr("y", d => yScales[i](d.par_pctile) - barHeight)
            .attr("width", d => xScales[i](d[query_female]) - xScales[i](0))
        },
        // Remove points that no longer exist in the filtered data 
        function(exit){
            exit
            .remove()
        }
    )
  })

}

function addLegend() {
  console.log("legend created")
  // Legend showing blue = male and pink = female
  // Place the legend above the graph so it does not overlap with the data

  const legend = svg.append("g")
  .attr(
      "transform",
      `translate(${innerWidth}, 0)`
  );

  // change this to loop through the graphs

  // Male
  legend.append("rect")
  .attr("width", 12)
  .attr("height", 12)
  .attr("fill", colorScale[0]);

  legend.append("text")
  .attr("x", 17)
  .attr("y", 10)
  .style("font-size", "10px")
  .text("Male");

  // Female
  legend.append("rect")
  .attr("x", 60)
  .attr("width", 12)
  .attr("height", 12)
  .attr("fill", colorScale[1]);

  legend.append("text")
  .attr("x", 77)
  .attr("y", 10)
  .style("font-size", "10px")
  .text("Female");
}