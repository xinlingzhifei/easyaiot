package com.basiclab.iot.system.auth;

import com.basiclab.iot.common.domain.CommonResult;
import com.basiclab.iot.common.domain.LoginUser;
import com.basiclab.iot.system.controller.admin.auth.AuthController;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuthSessionCheckControllerTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void authenticatedSessionReturnsCompactSuccessResponse() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        new LoginUser().setId(42L).setTenantId(7L),
                        null,
                        List.of()
                )
        );

        CommonResult<Boolean> result = new AuthController().checkSession(response);

        assertEquals(200, response.getStatus());
        assertEquals(0, result.getCode());
        assertTrue(result.getData());
    }

    @Test
    void unauthenticatedSessionReturnsHttpUnauthorized() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        CommonResult<Boolean> result = new AuthController().checkSession(response);

        assertEquals(401, response.getStatus());
        assertEquals(0, result.getCode());
        assertFalse(result.getData());
    }
}
