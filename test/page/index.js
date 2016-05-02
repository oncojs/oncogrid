var donors = [
  { "id": "DO1", "age_diagnosis": 49, "alive": true},
  { "id": "DO2", "age_diagnosis": 62, "alive": false},
  { "id": "DO3", "age_diagnosis": 59, "alive": true},
  { "id": "DO4", "age_diagnosis": 59, "alive": true},
  { "id": "DO5", "age_diagnosis": 59, "alive": true},
  { "id": "DO6", "age_diagnosis": 59, "alive": true},
  { "id": "DO7", "age_diagnosis": 59, "alive": true}
];


var genes = [
  { "id": "ENSG00000141510", "symbol": "TP53" },
  { "id": "ENSG00000157764", "symbol": "BRAF" },
  { "id": "ENSG00000155657", "symbol": "TTN"},
  { "id": "ENSG00000164796", "symbol": "CSMD3"}
];


var observations = [
  { "id": "MU1", "donorId": "DO1", "geneId": "ENSG00000157764" },
  { "id": "MU2", "donorId": "DO1", "geneId": "ENSG00000141510" },
  { "id": "MU3", "donorId": "DO2", "geneId": "ENSG00000141510" },
  { "id": "MU4", "donorId": "DO3", "geneId": "ENSG00000157764" },
  { "id": "MU5", "donorId": "DO4", "geneId": "ENSG00000157764" },
  { "id": "MU6", "donorId": "DO4", "geneId": "ENSG00000164796" },
  { "id": "MU7", "donorId": "DO5", "geneId": "ENSG00000155657" },
  { "id": "MU8", "donorId": "DO5", "geneId": "ENSG00000157764" },
  { "id": "MU9", "donorId": "DO6", "geneId": "ENSG00000157764" }
];

var params = {
    element: '#grid-div',
    donors: donors,
    genes: genes,
    observations: observations,
    height: 450,
    width: 700,
    heatMap: true
};

var grid = new OncoGrid(params);
grid.render();