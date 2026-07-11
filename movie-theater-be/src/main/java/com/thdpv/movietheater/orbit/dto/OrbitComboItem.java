package com.thdpv.movietheater.orbit.dto;

import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OrbitComboItem {
    private UUID comboUuid;
    private int quantity;
}
