import unittest
from unittest.mock import MagicMock
from unittest.mock import patch
import datetime

import rsvp

# Intentionally break the _service method so that we don't actually hit the Google Sheets API
rsvp._service = MagicMock(side_effect=NotImplementedError)

rsvp._read_spreadsheet = MagicMock(return_value=(
    # Header
    ['Category', 'Expected headcount', 'Names', 'Address(es)', 'Wedding?', 'Reception?', 'Which Invite?', 'Invite Sent?', 'Date Sent', 'RSVP provided?', 'RSVP Created', 
    'RSVP Modified', 'Primary Guest Name', 'Primary Guest Email', 'Primary Guest Phone', 'Primary Guest Ceremony', 'Primary Guest Reception', 'Comments',  'Guest2 Name', 'Guest2 Email', 'Guest2 Phone', 'Guest2 Ceremony', 'Guest2 Reception', 'Guest3 Name', 'Guest3 Email', 'Guest3 Phone', 'Guest3 Ceremony', 'Guest3 Reception', 'Guest4 Name', 'Guest4 Email', 'Guest4 Phone', 'Guest4 Ceremony', 'Guest4 Reception', 'Guest5 Name', 'Guest5 Email', 'Guest5 Phone', 'Guest5 Ceremony', 'Guest5 Reception', 'Guest6 Name', 'Guest6 Email', 'Guest6 Phone', 'Guest6 Ceremony', 'Guest6 Reception', 'Guest7 Name', 'Guest7 Email', 'Guest7 Phone', 'Guest7 Ceremony', 'Guest7 Reception', 'Guest8 Name', 'Guest8 Email', 'Guest8 Phone', 'Guest8 Ceremony', 'Guest8 Reception', 'Guest9 Name', 'Guest9 Email', 'Guest9 Phone', 'Guest9 Ceremony', 'Guest9 Reception', 'Guest10 Name', 'Guest10 Email', 'Guest10 Phone', 'Guest10 Ceremony', 'Guest10 Reception'],

    # Various guests
    [
        # One guest (previously responded)
        ['', '2', 'Felonious Gru', '', 'FALSE', 'TRUE', '', 'YES', '', 'YES', '2024-02-26 1:06:30', '2024-03-15 18:40:05', 'Gru', 'Gru@example.com', '+1 123 567 890', 'TRUE', 'FALSE', 'No comment'], 

        # Two Guests (with no response yet)
        ['', '2', 'King Bob & Stuart the Minion', '', 'TRUE', 'TRUE', '', 'YES', '', 'YES', '', '', 'King Bob', 'bob@example.com', '+1 123 567 890', 'TRUE', 'FALSE', 'King Bob!!!', 'Stuart', 'stuart@example.com', '+1 123 567 890', 'FALSE', 'TRUE'], 

        # 10 guests
        ['', '1', 'David Brampton', 'UK', 'TRUE', 'TRUE', '', 'NO', '', 'YES', '2024-03-11 22:28:42', '2024-03-11 23:15:30', 'David Brampton', 'super.dr.dood@gmail.com', '', 'TRUE', 'FALSE', 'David has too many guests', 'David\'s Guest', '', '', 'TRUE', 'FALSE', '3', '', '', 'FALSE', 'FALSE', '4', '', '', 'FALSE', 'FALSE', '5', '', '', 'FALSE', 'FALSE', '6', '', '', 'FALSE', 'FALSE', '7', '', '', 'FALSE', 'FALSE', '8', '', '', 'FALSE', 'FALSE', '9', '', '', 'FALSE', 'FALSE', '10', '10@example.com', '1234', 'TRUE', 'TRUE'],

        # Trailer
        ['', '', 'Total Expected Headcount', '', '14', '16', '', '', '', '', '', '', '', '7', '2', '', '', '']
    ],
))

class TestColumnName(unittest.TestCase):
    def test_various(self):
        self.assertEqual(rsvp.column_name(1), 'A')
        self.assertEqual(rsvp.column_name(2), 'B')
        self.assertEqual(rsvp.column_name(26), 'Z')
        self.assertEqual(rsvp.column_name(27), 'AA')


class TestCreateColumnMap(unittest.TestCase):
    def test_valid(self):
        header, _ = rsvp._read_spreadsheet()
        got = rsvp.create_column_map(header)
        want = {
            "INVITED_TO_WEDDING" : 4,       # E
            "INVITED_TO_RECEPTION" : 5,     # F
            "WHICH_INVITE" : 6,             # G
            "INVITE_SENT" : 7,              # H
            "DATE_SENT"   : 8,              # I
            "RSVP_CREATED" : 10,            # K
            "RSVP_MODIFIED" : 11,           # L
            "PRIMARY_GUEST" : 12,           # M
            "PRIMARY_GUEST_EMAIL" : 13,     # N
            "PRIMARY_GUEST_PHONE" : 14,     # O
            "PRIMARY_GUEST_CEREMONY" : 15,  # P
            "PRIMARY_GUEST_RECEPTION" : 16, # Q
            "COMMENTS" : 17,  # R

            'GUEST2': 18, 'GUEST2_EMAIL': 19, 'GUEST2_PHONE': 20, 'GUEST2_CEREMONY': 21, 'GUEST2_RECEPTION': 22,
            'GUEST3': 23, 'GUEST3_EMAIL': 24, 'GUEST3_PHONE': 25, 'GUEST3_CEREMONY': 26, 'GUEST3_RECEPTION': 27,
            'GUEST4': 28, 'GUEST4_EMAIL': 29, 'GUEST4_PHONE': 30, 'GUEST4_CEREMONY': 31, 'GUEST4_RECEPTION': 32,
            'GUEST5': 33, 'GUEST5_EMAIL': 34, 'GUEST5_PHONE': 35, 'GUEST5_CEREMONY': 36, 'GUEST5_RECEPTION': 37,
            'GUEST6': 38, 'GUEST6_EMAIL': 39, 'GUEST6_PHONE': 40, 'GUEST6_CEREMONY': 41, 'GUEST6_RECEPTION': 42,
            'GUEST7': 43, 'GUEST7_EMAIL': 44, 'GUEST7_PHONE': 45, 'GUEST7_CEREMONY': 46, 'GUEST7_RECEPTION': 47,
            'GUEST8': 48, 'GUEST8_EMAIL': 49, 'GUEST8_PHONE': 50, 'GUEST8_CEREMONY': 51, 'GUEST8_RECEPTION': 52,
            'GUEST9': 53, 'GUEST9_EMAIL': 54, 'GUEST9_PHONE': 55, 'GUEST9_CEREMONY': 56, 'GUEST9_RECEPTION': 57,
            'GUEST10': 58, 'GUEST10_EMAIL': 59, 'GUEST10_PHONE': 60, 'GUEST10_CEREMONY': 61, 'GUEST10_RECEPTION': 62,
        }

        self.assertEqual(got, want)


class TestLookup(unittest.TestCase):
    def test_valid(self):
        got = rsvp.lookup('King Bob')
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
        got = rsvp.lookup('Gru')
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
            rsvp.lookup('Vector Perkins')

    def test_missing_2nd_guest(self):
        """A secondary guest"""
        with self.assertRaises(rsvp.NotFoundException):
            rsvp.lookup('Stuart')

class TestUpdate(unittest.TestCase):
    def test_write_back_as_is(self):
        with patch('rsvp.datetime') as mock_datetime:
            mock_datetime.datetime.now.return_value = datetime.datetime(2010, 10, 8)

            rsvp._write_spreadsheet = MagicMock(return_value=True)
            data = rsvp.lookup('King Bob')
            rsvp.update(data)

            rsvp._write_spreadsheet.assert_called_with(
                11, 4,
                ['2010-10-08 00:00:00', '2010-10-08 00:00:00', 'King Bob', 'bob@example.com', '\'+1 123 567 890', 'TRUE', 'FALSE', 'King Bob!!!', 'Stuart', 'stuart@example.com', '\'+1 123 567 890', 'FALSE', 'TRUE'] + [''] * (8 * 5), 
            )

    def test_write_back_with_update_with_10_guests(self):
        with patch('rsvp.datetime') as mock_datetime:
            mock_datetime.datetime.now.return_value = datetime.datetime(2010, 10, 8)

            rsvp._write_spreadsheet = MagicMock(return_value=True)
            data = rsvp.lookup('David Brampton')
            rsvp.update(data)

            rsvp._write_spreadsheet.assert_called_with(
                11, 5,
                ['2024-03-11 22:28:42', '2010-10-08 00:00:00', 'David Brampton', 'super.dr.dood@gmail.com', '', 'TRUE', 'FALSE', 'David has too many guests', 'David\'s Guest', '', '', 'TRUE', 'FALSE', '3', '', '', 'FALSE', 'FALSE', '4', '', '', 'FALSE', 'FALSE', '5', '', '', 'FALSE', 'FALSE', '6', '', '', 'FALSE', 'FALSE', '7', '', '', 'FALSE', 'FALSE', '8', '', '', 'FALSE', 'FALSE', '9', '', '', 'FALSE', 'FALSE', '10', '10@example.com', '\'1234', 'TRUE', 'TRUE',]
            )

    def test_missing(self):
        """Not a valid guest"""
        data = rsvp.lookup('King Bob')
        data['guests'][0]['name'] = 'Vector Perkins'

        with self.assertRaises(rsvp.NotFoundException):
            rsvp.update(data)

if __name__ == '__main__':
    unittest.main()