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
      element: '#test3',
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
      expect(d3.select(element).select('.og-maingrid-svg').attr('width')).to.be.equal('1080');
      expect(d3.select(element).select('.og-maingrid-svg').attr('height')).to.be.equal('695');
    });

  });
};

describe('Histogram', function () {
  emptyTester();
});
