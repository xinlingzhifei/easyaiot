import os
import unittest
from unittest.mock import Mock, patch

from app.services.post_process_sink_client import publish_post_process_request


class PostProcessSinkClientTest(unittest.TestCase):

    def test_missing_token_fails_closed_without_http_request(self):
        with patch.dict(os.environ, {}, clear=True), patch(
            'app.services.post_process_sink_client.requests.post'
        ) as post:
            self.assertFalse(publish_post_process_request({}))

        post.assert_not_called()

    def test_service_token_is_sent_in_dedicated_header(self):
        token = 'post-process-token-at-least-32-bytes'
        response = Mock(status_code=200)
        response.json.return_value = {'code': 0}

        with patch.dict(
            os.environ,
            {
                'IOT_SINK_POST_PROCESS_TOKEN': token,
                'IOT_SINK_API_URL': 'http://sink.internal',
            },
            clear=True,
        ), patch(
            'app.services.post_process_sink_client.requests.post',
            return_value=response,
        ) as post:
            self.assertTrue(publish_post_process_request({}))

        self.assertEqual(
            token,
            post.call_args.kwargs['headers']['X-Iot-Sink-Token'],
        )


if __name__ == '__main__':
    unittest.main()
