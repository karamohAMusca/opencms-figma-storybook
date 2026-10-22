<%@page buffer="none" session="false" pageEncoding="UTF-8" trimDirectiveWhitespaces="true"%>
<%@taglib prefix="cms" uri="http://www.opencms.org/taglib/cms"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%-- GENERATO da figma-storybook/scripts/export-opencms.mjs: non modificare a mano, cambia figma-storybook/src/screens/login/login.template.js. --%>
<%-- Schermata Figma "Login – Mobile" (1:27). Usa i componenti Input (elements/fx-input.jsp) e Button. --%>
<cms:formatter var="content" val="value">
<section class="fx-login">
    <div class="fx-login__inner">
        <header class="fx-login__header">
            <c:if test="${value.LogoText.isSet}">
                <div class="fx-login__logo" aria-hidden="true">${value.LogoText}</div>
            </c:if>
            <h1 class="fx-login__title">${value.Title}</h1>
            <c:if test="${value.Subtitle.isSet}">
                <p class="fx-login__subtitle">${value.Subtitle}</p>
            </c:if>
        </header>
        <form class="fx-login__card" method="post" action="${value.Action.toLink}">
            <cms:include file="/system/modules/it.progetti.figma/elements/fx-input.jsp">
                <cms:param name="id" value="fx-login-${cms.element.instanceId}-email" />
                <cms:param name="name" value="email" />
                <cms:param name="type" value="email" />
                <cms:param name="label" value="${value.EmailLabel}" />
                <cms:param name="placeholder" value="${value.EmailPlaceholder}" />
                <cms:param name="autocomplete" value="email" />
            </cms:include>
            <cms:include file="/system/modules/it.progetti.figma/elements/fx-input.jsp">
                <cms:param name="id" value="fx-login-${cms.element.instanceId}-password" />
                <cms:param name="name" value="password" />
                <cms:param name="type" value="password" />
                <cms:param name="label" value="${value.PasswordLabel}" />
                <cms:param name="placeholder" value="${value.PasswordPlaceholder}" />
                <cms:param name="autocomplete" value="current-password" />
            </cms:include>
            <c:if test="${value.ForgotText.isSet and value.ForgotLink.isSet}">
                <a class="fx-login__forgot" href="${value.ForgotLink.toLink}">${value.ForgotText}</a>
            </c:if>
            <button class="fx-button fx-button--primary fx-button--full" type="submit">${value.SubmitText}</button>
            <c:if test="${value.GoogleText.isSet and value.GoogleLink.isSet}">
                <a class="fx-button fx-button--secondary fx-button--full" href="${value.GoogleLink.toLink}">${value.GoogleText}</a>
            </c:if>
        </form>
        <c:if test="${value.SignupText.isSet}">
            <p class="fx-login__footer">${value.SignupText} <c:if test="${value.SignupLinkText.isSet and value.SignupLink.isSet}"><a href="${value.SignupLink.toLink}">${value.SignupLinkText}</a></c:if></p>
        </c:if>
    </div>
</section>
</cms:formatter>
