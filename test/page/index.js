var donors = [{ "donorId": "DO1", "age": 49 }, { "donorId": "DO2", "age": 62 }, { "donorId": "DO3", "age": 59 }];
var genes = [{ "id": "ENSG00000141510", "symbol": "TP53" }, { "id": "ENSG00000157764", "symbol": "BRAF" }];
var observations = [{ "id": "MU1", "donorId": "DO1", "gene": "ENSG00000157764" },
    { "id": "MU2", "donorId": "DO1", "gene": "ENSG00000141510" },
    { "id": "MU3", "donorId": "DO2", "gene": "ENSG00000141510" },
    { "id": "MU4", "donorId": "DO3", "gene": "ENSG00000157764" }];

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