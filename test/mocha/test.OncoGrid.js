/*global chai*/
var expect = chai.expect;

var destroyTester = function (grid) {
  var element = grid.mainGrid.element;

  describe('Cleanup ' + element, function () {
    grid.destroy();

    it('should have no more elements on screen', function () {
      expect(d3.select(element).selectAll('.og-maingrid-svg')[0]).is.empty;
    });
  });
};


var emptyTester = function () {
  describe('Empty Constructor', function () {

    var grid = new OncoGrid({element: '#test1'});

    after(function () {
      destroyTester(grid);
    });

    describe('Initialization', function () {

      it('should have an empty list for donors', function () {
        expect(grid.donors).to.be.empty;
      });
      it('should have an empty list for genes', function () {
        expect(grid.genes).to.be.empty;
      });
      it('should have an empty list for observations', function () {
        expect(grid.observations).to.be.empty;
      });
      it('should only have one chart registered', function () {
        expect(grid.charts.length).to.be.equal(1);
      });
      it('should contain an instance of main grid', function () {
        expect(grid.mainGrid).to.exist;
      });
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
      element: '#test2',
      donors: donors,
      genes: genes,
      observations: observations
    };

    var grid = new OncoGrid(params);

    after(function () {
      destroyTester(grid);
    });

    describe('Initialization', function () {
      it('should contain 3 donors', function () {
        expect(grid.donors.length).to.be.equal(3);
      });

      it('should contain 2 genes', function () {
        expect(grid.genes.length).to.be.equal(2);
      });

      it('should contained 4 observations', function () {
        expect(grid.observations.length).to.be.equal(4);
      });

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

    describe('Initialization', function () {
      it('should contain 3 donors', function () {
        expect(grid.donors.length).to.be.equal(3);
      });

      it('should contain 2 genes', function () {
        expect(grid.genes.length).to.be.equal(2);
      });

      it('should contained 4 observations', function () {
        expect(grid.observations.length).to.be.equal(4);
      });

      it('should have donor DO1 ranked first', function () {
        expect(grid.donors[0].id).to.be.equal('DO1');
      });

      it('should have donor DO1 with a score of 12', function () {
        expect(grid.donors[0].score).to.be.equal(12);
      });

      it('should have donor DO2 with a score of 8', function () {
        expect(grid.donors[1].score).to.be.equal(8);
      });

      it('should have donor DO3 ranked last', function () {
        expect(grid.donors[grid.donors.length - 1].id).to.be.equal('DO3');
      });

      it('should have donor DO3 with a score of 4', function () {
        expect(grid.donors[grid.donors.length - 1].score).to.be.equal(4);
      });

      it('Main Grid should have correct dimensions', function () {
        // Width and Height are computer based on input dimensions and margins
        expect(d3.select(element).select('.og-maingrid-svg').attr('width')).to.be.equal('100%');
      });

    });

  });
};

var swapGenes = function() {
  var donors = [{"id": "DO1", "age": 49}, {"id": "DO2", "age": 62}, {"id": "DO3", "age": 59}];
  var genes = [{"id": "ENSG00000141510", "symbol": "TP53"}, {"id": "ENSG00000157764", "symbol": "BRAF"}];
  var observations = [{"id": "MU1", "donorId": "DO1", "geneId": "ENSG00000157764"},
    {"id": "MU2", "donorId": "DO1", "geneId": "ENSG00000141510"},
    {"id": "MU3", "donorId": "DO2", "geneId": "ENSG00000141510"},
    {"id": "MU4", "donorId": "DO3", "geneId": "ENSG00000157764"}];

  var params = {
    element: '#test4',
    donors: donors,
    genes: genes,
    observations: observations,
    height: 450,
    width: 700
  };

  var grid = new OncoGrid(params);
  grid.render();
  var element = grid.mainGrid.element;

  describe('Swap Gene Order', function() {
    after(function () {
      destroyTester(grid);
    });

    describe('Update', function () {
      var temp = grid.genes[1];
      grid.genes[1] = grid.genes[0];
      grid.genes[0] = temp;
      grid.update(grid)(true);

      it('should have donor DO1 ranked first', function () {
        expect(grid.donors[0].id).to.be.equal('DO1');
      });

      it('should have donor DO1 with a score of 12', function () {
        expect(grid.donors[0].score).to.be.equal(12);
      });

      it('should have donor DO2 with a score of 8', function () {
        expect(grid.donors[1].score).to.be.equal(8);
      });

      it('should have donor DO2 ranked last', function () {
        expect(grid.donors[grid.donors.length - 1].id).to.be.equal('DO2');
      });

      it('should have donor DO2 with a score of 4', function () {
        expect(grid.donors[grid.donors.length - 1].score).to.be.equal(4);
      });
    });
  });

};

describe('OncoGrid', function () {
  emptyTester();
  simpleTester();
  dataAndConfig();
  swapGenes();
});
