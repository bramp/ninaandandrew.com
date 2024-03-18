import unittest
from unittest.mock import MagicMock
import rsvp

# Intentionally break the _service method so that we don't actually hit the Google Sheets API
rsvp._service = MagicMock(side_effect=NotImplementedError)

rsvp._read_spreadsheet = MagicMock(return_value=[
    # Header
    ['Category', 'Expected headcount', 'Names', 'Address(es)', 'Wedding?', 'Reception?', 'Which Invite?', 'Invite Sent?', 'Date Sent', 'RSVP provided?', 'RSVP Created', 'RSVP Modified', 'Primary Guest', 'Email(s)', 'Phone#', 'Attending Ceremony?', 'Attending Reception?', 'Comments', 'Guest1 Name', 'Guest1 Email', 'Guest1 Phone', 'Guest1 Ceremony', 'Guest1 Reception', 'Guest2 Name', 'Guest2 Email', 'Guest2 Phone', 'Guest2 Ceremony', 'Guest2 Reception', 'Guest3 Name', 'Guest3 Email', 'Guest3 Phone', 'Guest3 Ceremony', 'Guest3 Reception', 'Guest4 Name', 'Guest4 Email', 'Guest4 Phone', 'Guest4 Ceremony', 'Guest4 Reception', 'Guest5 Name', 'Guest5 Email', 'Guest5 Phone', 'Guest5 Ceremony', 'Guest5 Reception', 'Guest6 Name', 'Guest6 Email', 'Guest6 Phone', 'Guest6 Ceremony', 'Guest6 Reception', 'Guest7 Name', 'Guest7 Email', 'Guest7 Phone', 'Guest7 Ceremony', 'Guest7 Reception', 'Guest8 Name', 'Guest8 Email', 'Guest8 Phone', 'Guest8 Ceremony', 'Guest8 Reception', 'Guest9 Name', 'Guest9 Email', 'Guest9 Phone', 'Guest9 Ceremony', 'Guest9 Reception', 'Guest10 Name', 'Guest10 Email', 'Guest10 Phone', 'Guest10 Ceremony', 'Guest10 Reception'],

    # Various guests
    ['', '2', 'Felonious Gru', '', 'FALSE', 'TRUE', '', 'YES', '', 'YES', '2024-02-26 1:06:30', '2024-03-15 18:40:05', 'Gru', 'Gru@example.com', '+1 123 567 890', 'TRUE', 'FALSE', 'No comment'], 
    ['', '2', 'King Bob & Stuart the Minion', '', 'TRUE', 'TRUE', '', 'YES', '', 'YES', '2024-02-26 1:06:30', '2024-03-15 18:40:05', 'King Bob', 'bob@example.com', '+1 123 567 890', 'TRUE', 'FALSE', 'King Bob!!!', 'Stuart', 'stuart@example.com', '+1 123 567 890', 'FALSE', 'TRUE'], 
    
    # Trailer
    ['', '', 'Total Expected Headcount', '', '14', '16', '', '', '', '', '', '', '', '7', '2', '', '', '']
])

class TestSpreadsheetToJson(unittest.TestCase):
    def test_valid(self):
        got = rsvp.spreadsheet_to_json('King Bob')
        self.assertEqual(got, {
            'ceremony': True,
            'reception': True,
            'comments': 'King Bob!!!',
            'guests': [{
                'ceremony': True,
                'reception': False,
                'email': 'bob@example.com',
                'name': 'King Bob',
                'phone': '+1 123 567 890',
            }, {
                'ceremony': False,
                'reception': True,
                'email': 'stuart@example.com',
                'name': 'Stuart',
                'phone': '+1 123 567 890',
            }],
        })

    def test_valid_single(self):
        got = rsvp.spreadsheet_to_json('Gru')
        self.assertEqual(got, {
            'ceremony': False,
            'reception': True,
            'comments': 'No comment',
            'guests': [{
                'ceremony': True,
                'email': 'Gru@example.com',
                'name': 'Gru',
                'phone': '+1 123 567 890',
                'reception': False
            }],
        })

    def test_missing(self):
        """Not a valid guest"""
        with self.assertRaises(rsvp.NotFoundException):
            rsvp.spreadsheet_to_json('Vector Perkins')

    def test_missing_2nd_guest(self):
        """A secondary guest"""
        with self.assertRaises(rsvp.NotFoundException):
            rsvp.spreadsheet_to_json('Stuart')


if __name__ == '__main__':
    unittest.main()