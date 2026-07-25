package com.thdpv.movietheater.orbit.dto.request;

import java.util.List;

import com.thdpv.movietheater.orbit.dto.OrbitComboItem;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateOrbitMemberCombosRequest {
    private List<OrbitComboItem> combos;
    private boolean completed;
}
