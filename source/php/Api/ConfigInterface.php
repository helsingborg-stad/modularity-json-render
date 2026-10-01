<?php

namespace ModularityJsonRender\Api;

interface ConfigInterface 
{
    public function getUrl(): string;
    public function getView(): string;
    public function getFieldMap(): array;
}