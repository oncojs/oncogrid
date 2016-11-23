/*global chai*/
var expect = chai.expect;

var destroyTester = function (grid) {
  var element = grid.mainGrid.element;

  describe('Cleanup ' + element, function () {
    grid.destroy();

    it('should have no more elements on screen', function () {
      expect(d3.select(element).selectAll('.og-maingrid-svg')[0]).is.empty;
    });

    it('should have cleaned up hidden tooltips', function () {
      expect(d3.select(element).selectAll('.og-tooltip-oncogrid')[0]).is.empty;
    });
  });
};


var emptyTester = function () {
  describe('Empty Constructor', function () {

    var donors = [{"id": "DO1", "age": 49}, {"id": "DO2", "age": 62}, {"id": "DO3", "age": 59}];
    var genes = [{"id": "ENSG00000141510", "symbol": "TP53"}, {"id": "ENSG00000157764", "symbol": "BRAF"}];
    var observations = [{"id": "MU1", "donorId": "DO1", "geneId": "ENSG00000157764"},
      {"id": "MU2", "donorId": "DO1", "geneId": "ENSG00000141510"},
      {"id": "MU3", "donorId": "DO2", "geneId": "ENSG00000141510"},
      {"id": "MU4", "donorId": "DO3", "geneId": "ENSG00000157764"}];

    var params = {
      element: '#test8',
      donors: donors,
      genes: genes,
      observations: observations,
      height: 450,
      width: 700
    };

    var grid = new OncoGrid(params);
    grid.render();
    var element = grid.mainGrid.element;

    after(function () {
      destroyTester(grid);
    });

    it('Main Grid should have correct dimensions', function () {
      // Width and Height are computer based on input dimensions and margins
      expect(d3.select(element).select('.og-maingrid-svg').attr('width')).to.be.equal('100%');
    });

    it('Two Tracks Present', function() {
      expect(d3.select(element).selectAll('.og-track').size()).to.be.equal(2);
    });

  });
};

var simpleTester = function () {
  describe('With Data but Unmatched', function () {

    var donors = [{"id": "DO27811", "age": 49}, {"id": "DO27853", "age": 62}, {
      "id": "DO27827",
      "age": 59
    }];
    var genes = [{"id": "ENSG00000141510", "symbol": "TP53"}, {"id": "ENSG00000157764", "symbol": "BRAF"}];
    var observations = [{"id": "MU47148354", "donorId": "DO7328", "geneId": "ENSG00000257923"},
      {"id": "MU47203364", "donorId": "DO7328", "geneId": "ENSG00000134982"},
      {"id": "MU47148354", "donorId": "DO7328", "geneId": "ENSG00000257923"},
      {"id": "MU47203364", "donorId": "DO7328", "geneId": "ENSG00000134982"}];

    var params = {
      element: '#test9',
      donors: donors,
      genes: genes,
      observations: observations
    };

    var grid = new OncoGrid(params);
    grid.render();
    var element = grid.mainGrid.element;

    after(function () {
      destroyTester(grid);
    });

    it('Two Tracks Present', function() {
      expect(d3.select(element).selectAll('.og-track').size()).to.be.equal(2);
    });

  });
};

var dataAndConfig = function () {
  describe('With Matching Data and Basic Config', function () {

    var donors = [{"id": "DO1", "age": 49}, {"id": "DO2", "age": 62}, {"id": "DO3", "age": 59}];
    var genes = [{"id": "ENSG00000141510", "symbol": "TP53"}, {"id": "ENSG00000157764", "symbol": "BRAF"}];
    var observations = [{"id": "MU1", "donorId": "DO1", "geneId": "ENSG00000157764"},
      {"id": "MU2", "donorId": "DO1", "geneId": "ENSG00000141510"},
      {"id": "MU3", "donorId": "DO2", "geneId": "ENSG00000141510"},
      {"id": "MU4", "donorId": "DO3", "geneId": "ENSG00000157764"}];

    var params = {
      element: '#test10',
      donors: donors,
      genes: genes,
      observations: observations,
      height: 450,
      width: 700
    };

    var grid = new OncoGrid(params);
    grid.render();
    var element = grid.mainGrid.element;

    after(function () {
      destroyTester(grid);
    });

    it('Two Tracks Present', function() {
      expect(d3.select(element).selectAll('.og-track').size()).to.be.equal(2);
    });

  });
};

describe('Tracks', function () {
  emptyTester();
  simpleTester();
  dataAndConfig();
});
