package com.basiclab.iot.common.exception.user;

/**
 * 验证码失效异常类
 * 
 * @author 翱翔的雄库鲁
 * @email andywebjava@163.com
 */
public class CaptchaExpireException extends UserException
{
    private static final long serialVersionUID = 1L;

    public CaptchaExpireException()
    {
        super("user.jcaptcha.expire", null);
    }
}
