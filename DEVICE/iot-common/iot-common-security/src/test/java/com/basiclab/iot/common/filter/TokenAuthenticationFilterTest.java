package com.basiclab.iot.common.filter;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TokenAuthenticationFilterTest {

    private final TestableTokenAuthenticationFilter filter = new TestableTokenAuthenticationFilter();

    @Test
    void shouldSkipTokenCheckRpcToPreventRecursiveAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(
                "GET", "/rpc-api/system/oauth2/token/check");
        request.addHeader("Authorization", "Bearer propagated-token");

        assertTrue(filter.shouldSkip(request));
    }

    @Test
    void shouldAuthenticateNormalApiRequest() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(
                "POST", "/admin-api/system/auth/media-permission-check");

        assertFalse(filter.shouldSkip(request));
    }

    private static final class TestableTokenAuthenticationFilter extends TokenAuthenticationFilter {

        private TestableTokenAuthenticationFilter() {
            super(null, null, null);
        }

        private boolean shouldSkip(MockHttpServletRequest request) throws Exception {
            return shouldNotFilter(request);
        }
    }
}
