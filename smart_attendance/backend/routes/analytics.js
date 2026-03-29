const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
// Future: Add auth middleware here
// const { protect, authorize } = require('../middleware/auth');

router.get('/trends', analyticsController.getDailyTrends);
router.get('/class-stats', analyticsController.getClassStats);
router.get('/defaulters', analyticsController.getDefaulters);
router.get('/export/csv', analyticsController.exportCSV);
router.get('/export/pdf', analyticsController.exportPDF);

module.exports = router;
