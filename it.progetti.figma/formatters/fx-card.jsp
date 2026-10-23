<%@page buffer="none" session="false" pageEncoding="UTF-8" trimDirectiveWhitespaces="true"%>
<%@taglib prefix="cms" uri="http://www.opencms.org/taglib/cms"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%-- GENERATO da figma-storybook/scripts/export-opencms.mjs: non modificare a mano, cambia figma-storybook/src/components/card/card.template.js. --%>
<%-- Componente Figma "Card" (44:10). Usa il componente Button. --%>
<cms:formatter var="content" val="value">
<article class="fx-card">
    <c:if test="${value.Image.isSet}">
        <img class="fx-card__image" src="${value.Image.toLink}" alt="${value.ImageAlt}">
    </c:if>
    <div class="fx-card__body">
        <div class="fx-card__texts">
            <h3 class="fx-card__title">${value.Title}</h3>
            <c:if test="${value.Text.isSet}">
                <p class="fx-card__text">${value.Text}</p>
            </c:if>
        </div>
        <c:if test="${value.ButtonText.isSet and value.ButtonLink.isSet}">
            <a class="fx-button fx-button--primary" href="${value.ButtonLink.toLink}">${value.ButtonText}</a>
        </c:if>
    </div>
</article>
</cms:formatter>
