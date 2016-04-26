var expect = chai.expect;

describe('OncoGrid', function() {

  describe('Empty Constructor', function () {
    var grid = new OncoGrid({});
    it('should have an empty list for donors', function() {
      expect(grid.donors).to.be.empty;
    });
    it('should have an empty list for genes', function() {
      expect(grid.genes).to.be.empty;
    });
    it('should have an empty list for observations', function() {
      expect(grid.observations).to.be.empty;
    });
    it('should only have one chart registered', function() {
      expect(grid.charts.length).to.be.equal(1);
    });
    it('should contain an instance of main grid', function () {
      expect(grid.mainGrid).to.exist;
    });
  });


  describe('With Data but Unmatched', function() {

    var donors = [{"donorId":"DO27811","age":49},{"donorId":"DO27853","age":62},{"donorId":"DO27827","age":59}];
    var genes = [{"id":"ENSG00000141510","symbol":"TP53"},{"id":"ENSG00000157764","symbol":"BRAF"}];
    var observations = [{"id":"MU47148354","donorId":"DO7328","gene":"ENSG00000257923"},
      {"id":"MU47203364","donorId":"DO7328","gene":"ENSG00000134982"},
      {"id":"MU47148354","donorId":"DO7328","gene":"ENSG00000257923"},
      {"id":"MU47203364","donorId":"DO7328","gene":"ENSG00000134982"}];

    var params = {
      donors: donors,
      genes: genes,
      observations: observations
    }

    var grid = new OncoGrid(params);

    it('should contain 3 donors', function () {
      expect(grid.donors.length).to.be.equal(3);
    });
  });

});
