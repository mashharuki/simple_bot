import unittest
from unittest.mock import MagicMock, patch
# Import the module to be tested (will be created next)
# from src import fr_monitor

class TestFRMonitor(unittest.TestCase):
    
    def test_check_thresholds_abnormal(self):
        # Allow import here to avoid error before file exists in TDD flow if running strictly
        # But for this tool I will assume I create the file next or stub it.
        # Let's mock the logic we expect.
        
        # Scenario: 300 assets, one exceeds threshold 0.0001 (0.01%)
        rates = [
            {'name': 'BTC', 'funding': 0.00001, 'apr': 0.0876}, # Normal
            {'name': 'ETH', 'funding': -0.0002, 'apr': -1.752}, # Abnormal Negative
            {'name': 'SOL', 'funding': 0.00015, 'apr': 1.314},  # Abnormal Positive
        ]
        threshold = 0.0001
        
        # Logic to be implemented in fr_monitor.check_thresholds(rates, threshold)
        # For now, I'll write the test assuming the function signature.
        from src.fr_monitor import check_thresholds
        
        abnormal = check_thresholds(rates, threshold)
        
        self.assertEqual(len(abnormal), 2)
        self.assertEqual(abnormal[0]['name'], 'ETH')
        self.assertEqual(abnormal[1]['name'], 'SOL')

    def test_format_message(self):
        from src.fr_monitor import format_message
        
        abnormal_item = {'name': 'ETH', 'funding': -0.0002, 'apr': -1.752}
        message = format_message([abnormal_item])
        
        self.assertIn("ETH", message)
        self.assertIn("-0.0200%", message) # 0.0002 * 100
        self.assertIn("Abnormal", message)

if __name__ == '__main__':
    unittest.main()
